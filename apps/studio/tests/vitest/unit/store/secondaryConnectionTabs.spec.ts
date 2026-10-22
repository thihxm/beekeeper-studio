import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import Vue from "vue"

// connHandlers pulls in every db client through the connection provider, which
// fails to load under jsdom. The saved connection gets a fake MySQL server.
const servers: Record<string, any> = {}
vi.mock("@commercial/backend/lib/connection-provider", () => ({
  __esModule: true,
  default: { for: (config: any) => servers[config.name] },
}))

import { UtilityConnection } from "@/lib/utility/UtilityConnection"
import { ConnHandlers } from "@commercial/backend/handlers/connHandlers"
import { QueryHandlers } from "@/handlers/queryHandlers"
import { removeState, state } from "@/handlers/handlerState"
import store from "@/store"
import CoreTabs from "@/components/CoreTabs.vue"
import { TransportOpenTab } from "@/common/transport/TransportOpenTab"
import { FakeUtilityProcess } from "@tests/vitest/lib/FakeUtilityProcess"
import { TestOrmConnection } from "@tests/lib/TestOrmConnection"
import { AppDbHandlers } from "@/handlers/appDbHandlers"

const W1 = "w1"
const C_KEY = "w1::connection::7"
const WINDOW_CONFIG = { id: 3, name: "app", connectionType: "postgresql", workspaceId: -1 } as any
const C = { id: 7, name: "shop-mysql", connectionType: "mysql", defaultDatabase: "shop", workspaceId: -1 } as any

const coreTabsMethods = (CoreTabs as any).options?.methods ?? (CoreTabs as any).methods

function fakeServer() {
  const clients: Record<string, any> = {}
  const client = (database: string) => ({
    connectionType: "mysql",
    server: { config: {} },
    database: { database },
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    supportedFeatures: vi.fn(async () => ({})),
    defaultSchema: vi.fn(async () => null),
    listDatabases: vi.fn(async () => ["audit", "shop"]),
    listInaccessibleDatabases: vi.fn(async () => []),
    listTables: vi.fn(async () => [{ name: "users", schema: null }]),
    listViews: vi.fn(async () => []),
    listMaterializedViews: vi.fn(async () => []),
    listRoutines: vi.fn(async () => []),
    listTableColumns: vi.fn(async () => [{ columnName: `${database}_id`, dataType: "int" }]),
    selectTop: vi.fn(async () => ({ result: [{ id: 1 }], fields: [] })),
    query: vi.fn(async () => ({
      execute: vi.fn(async () => [{ rows: [{ db: database }], fields: [] }]),
      cancel: vi.fn(async () => undefined),
    })),
  })
  servers[C.name] = {
    clients,
    createConnection: vi.fn((database: string) => (clients[database] = client(database))),
    db: (database: string) => clients[database],
    destroyConnection: vi.fn((database: string) => delete clients[database]),
    disconnect: vi.fn(),
    end: vi.fn(),
    getServerConfig: () => ({}),
  }
  return servers[C.name]
}

describe("tabs on a saved connection opened from the tree", () => {
  let utility: FakeUtilityProcess
  let received: { name: string, sId: string, database?: string }[]

  beforeEach(async () => {
    await TestOrmConnection.connect()
    Object.assign(window, { main: new Proxy({}, { get: (cache: any, key) => (cache[key] ??= vi.fn()) }) })
    received = []
    const full = async (c: any) => ({ ...(await AppDbHandlers["appdb/saved/new"]({ init: c })), ...c })
    const saved = await Promise.all([WINDOW_CONFIG, C].map(full))
    const handlers: Record<string, any> = {}
    for (const [name, handler] of Object.entries({
      ...(ConnHandlers as any),
      ...(QueryHandlers as any),
      "appdb/saved/find": async () => saved,
    })) {
      handlers[name] = async (args: any) => {
        received.push({ name, sId: args.sId, database: args.database })
        return await (handler as any)(args)
      }
    }
    utility = new FakeUtilityProcess(handlers)
    const $util = new UtilityConnection()
    Vue.prototype.$util = $util
    $util.setPort(utility.attach(W1) as any, W1)

    state(W1).connection = { connectionType: "postgresql", disconnect: vi.fn(async () => undefined) } as any
    store.commit("setUsername", "tester")
    store.commit("connected", true)
    store.commit("newConnection", WINDOW_CONFIG)
    await store.dispatch("connectionTree/loadSaved")
    fakeServer()
  })

  afterEach(async () => {
    store.commit("connectionTree/clear")
    store.commit("clearConnection")
    utility.close()
    await removeState(W1)
    await TestOrmConnection.disconnect()
  })

  /** run a CoreTabs method against the real store, collecting the tabs it adds */
  function coreTabs() {
    const added: TransportOpenTab[] = []
    const ctx = {
      tabItems: [],
      $store: store,
      addTab: vi.fn(async (tab: TransportOpenTab) => { added.push(tab) }),
      getNextQueryTitle: () => "Query #1",
    }
    return { added, ctx }
  }

  const clientOf = (tab: TransportOpenTab) => store.getters.connectionFor(tab.databaseName, tab.targetConnectionId)

  it("entity tabs persist and run on the secondary connection", async () => {
    await store.dispatch("connectionTree/open", 7)
    const { added, ctx } = coreTabs()
    await coreTabsMethods.openTable.call(ctx, { table: { name: "users", schema: null, entityType: "table" }, database: "shop", connectionId: 7 })
    await coreTabsMethods.openTableProperties.call(ctx, { table: { name: "log", schema: null, entityType: "table" }, database: "audit", connectionId: 7 })

    expect(added.map((t) => [t.tabType, t.targetConnectionId, t.databaseName])).toEqual([
      ["table", 7, "shop"],
      ["table-properties", 7, "audit"],
    ])

    received = []
    const rows = await clientOf(added[0]).selectTop("users", 0, 100, [], [], null)
    expect(rows.result).toEqual([{ id: 1 }])
    expect(received).toEqual([{ name: "conn/selectTop", sId: C_KEY, database: undefined }])

    received = []
    const columns = await clientOf(added[1]).listTableColumns("log", null)
    expect(columns).toEqual([{ columnName: "audit_id", dataType: "int" }])
    expect(received).toEqual([{ name: "conn/listTableColumns", sId: C_KEY, database: "audit" }])
  })

  it("new query runs and cancels on the secondary connection", async () => {
    await store.dispatch("connectionTree/open", 7)
    const { added, ctx } = coreTabs()
    await coreTabsMethods.createQueryOnConnection.call(ctx, { connectionId: 7, database: null })
    await coreTabsMethods.createQueryOnConnection.call(ctx, { connectionId: 7, database: "audit" })
    expect(added.map((t) => [t.tabType, t.targetConnectionId, t.databaseName])).toEqual([
      ["query", 7, "shop"],
      ["query", 7, "audit"],
    ])

    received = []
    const query = await clientOf(added[0]).query("select database()", 21)
    const result = await query.execute()
    expect(result[0].rows).toEqual([{ db: "shop" }])
    const second = await clientOf(added[0]).query("select sleep(10)", 21)
    await second.cancel()

    expect(received.map((r) => [r.name, r.sId])).toEqual([
      ["conn/query", C_KEY],
      ["query/execute", C_KEY],
      ["conn/query", C_KEY],
      ["query/cancel", C_KEY],
    ])
    expect(state(W1).queries.size).toBe(0)
  })

  it("restored tab connects its connection on first use", async () => {
    // a tab saved before the restart; nothing is open for connection 7
    const restored = { tabType: "table", targetConnectionId: 7, databaseName: "shop" } as TransportOpenTab
    expect(store.getters["connectionTree/connection"](7).status).toBe("idle")
    received = []

    const columns = await clientOf(restored).listTableColumns("users", null)

    expect(columns).toEqual([{ columnName: "shop_id", dataType: "int" }])
    const names = received.map((r) => r.name)
    expect(names.indexOf("conn/create")).toBeGreaterThanOrEqual(0)
    expect(names.indexOf("conn/create")).toBeLessThan(names.lastIndexOf("conn/listTableColumns"))
    for (const r of received) expect(r.sId).toBe(C_KEY)
    expect(received.filter((r) => r.name === "conn/create")).toHaveLength(1)
  })
})
