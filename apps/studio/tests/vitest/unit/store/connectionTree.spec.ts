import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import Vue from "vue"

// connHandlers pulls in every db client through the connection provider, which
// fails to load under jsdom. Each saved connection gets a fake server instead.
const servers: Record<string, any> = {}
vi.mock("@commercial/backend/lib/connection-provider", () => ({
  __esModule: true,
  default: { for: (config: any) => servers[config.name] },
}))

import { UtilityConnection } from "@/lib/utility/UtilityConnection"
import { ConnHandlers } from "@commercial/backend/handlers/connHandlers"
import { removeState, state } from "@/handlers/handlerState"
import store from "@/store"
import { BeekeeperPlugin } from "@/plugins/BeekeeperPlugin"
import { FakeUtilityProcess } from "@tests/vitest/lib/FakeUtilityProcess"
import { TestOrmConnection } from "@tests/lib/TestOrmConnection"
import { AppDbHandlers } from "@/handlers/appDbHandlers"
import { SnowflakeAuthType } from "@/lib/db/types"

const W1 = "w1"
const C_KEY = "w1::connection::7"
const WINDOW_CONFIG = { id: 3, name: "app", connectionType: "postgresql", workspaceId: -1, labelColor: "red" } as any
const C = { id: 7, name: "shop-mysql", connectionType: "mysql", defaultDatabase: "shop", workspaceId: -1, labelColor: "blue" } as any
const D = { id: 9, name: "reports", connectionType: "postgresql", defaultDatabase: "reports", workspaceId: -1, labelColor: "default" } as any
const ROACH = { id: 11, name: "roach", connectionType: "cockroachdb", workspaceId: -1, options: { jwtAuthEnabled: true }, password: null } as any
const SNOW = { id: 13, name: "snow", connectionType: "snowflake", workspaceId: -1, snowflakeOptions: { authType: SnowflakeAuthType.MFACode } } as any

/** A fake server: one client per database, all answering like a MySQL server with `shop` and `audit` */
function fakeServer(name: string, opts: { failConnect?: Error, slowConnect?: Promise<void>, failListDatabases?: Error } = {}) {
  const clients: Record<string, any> = {}
  const client = (database: string) => ({
    connectionType: "mysql",
    server: { config: {} },
    database: { database },
    connect: vi.fn(async () => {
      if (opts.slowConnect) await opts.slowConnect
      if (opts.failConnect) throw opts.failConnect
    }),
    disconnect: vi.fn(async () => undefined),
    supportedFeatures: vi.fn(async () => ({ customRoutines: true })),
    defaultSchema: vi.fn(async () => null),
    listDatabases: vi.fn(async () => {
      if (opts.failListDatabases) throw opts.failListDatabases
      return ["audit", "shop"]
    }),
    listInaccessibleDatabases: vi.fn(async () => []),
    listTables: vi.fn(async () => [{ name: database === "audit" ? "log" : "users", schema: null }]),
    listViews: vi.fn(async () => []),
    listMaterializedViews: vi.fn(async () => []),
    listRoutines: vi.fn(async () => []),
  })
  const server = {
    clients,
    createConnection: vi.fn((database: string) => (clients[database] = client(database))),
    db: (database: string) => clients[database],
    destroyConnection: vi.fn((database: string) => delete clients[database]),
    disconnect: vi.fn(),
    end: vi.fn(),
    getServerConfig: () => ({}),
  }
  servers[name] = server
  return server
}

describe("secondary connections in the entity tree", () => {
  let utility: FakeUtilityProcess
  let $util: UtilityConnection
  /** every request the utility received: handler name and the session it ran in */
  let received: { name: string, sId: string, database?: string }[]
  let sent: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    await TestOrmConnection.connect()
    const bridge = new Proxy({}, { get: (cache: any, key) => (cache[key] ??= vi.fn()) })
    Object.assign(window, { main: bridge })

    received = []
    // complete configs, as the renderer gets them from the app database
    const full = async (c: any) => ({ ...(await AppDbHandlers["appdb/saved/new"]({ init: c })), ...c })
    const saved = await Promise.all([WINDOW_CONFIG, C, D, ROACH, SNOW].map(full))
    const handlers: Record<string, any> = {}
    for (const [name, handler] of Object.entries({
      ...(ConnHandlers as any),
      "appdb/saved/find": async () => saved,
    })) {
      handlers[name] = async (args: any) => {
        received.push({ name, sId: args.sId, database: args.database })
        return await (handler as any)(args)
      }
    }
    utility = new FakeUtilityProcess(handlers)
    $util = new UtilityConnection()
    Vue.prototype.$util = $util
    $util.setPort(utility.attach(W1) as any, W1)
    sent = vi.spyOn($util, "send")

    // the window is connected to `app`
    state(W1).connection = { connectionType: "postgresql", disconnect: vi.fn(async () => undefined) } as any
    store.commit("setUsername", "tester")
    store.commit("connected", true)
    store.commit("newConnection", WINDOW_CONFIG)
    await store.dispatch("connectionTree/loadSaved")
  })

  afterEach(async () => {
    store.commit("connectionTree/clear")
    store.commit("clearConnection")
    utility.close()
    await removeState(W1)
    await TestOrmConnection.disconnect()
    vi.restoreAllMocks()
  })

  const connectionOf = (id: number) => store.getters["connectionTree/connection"](id)

  it("loads every saved connection of the workspace", () => {
    const ids = store.state["connectionTree"].savedConnections.map((c: any) => c.id)
    expect(ids).toEqual([3, 7, 9, 11, 13])
    expect(sent.mock.calls.find(([name]) => name === "appdb/saved/find")[1]).toEqual({ options: { where: { workspaceId: -1 } } })
  })

  it("expanding a connection creates it in its own session", async () => {
    fakeServer(C.name)
    sent.mockClear()
    received = []

    expect(await store.dispatch("connectionTree/open", 7)).toBe(true)

    const creates = received.filter((r) => r.name === "conn/create")
    expect(creates).toEqual([{ name: "conn/create", sId: C_KEY, database: undefined }])
    const createArgs = sent.mock.calls.find(([name]) => name === "conn/create")[1]
    expect(createArgs.config.id).toBe(7)
    expect(createArgs.sId).toBe(C_KEY)
    // nothing ran in the window's session
    for (const r of received) {
      if (!r.name.startsWith("appdb/")) expect(r.sId).toBe(C_KEY)
    }
    expect(state(W1).server).toBeNull()
    expect(connectionOf(7).status).toBe("connected")
    expect(connectionOf(7).databaseList).toEqual(["audit", "shop"])
    expect(connectionOf(7).databaseEntities.shop.tables.map((t: any) => t.name)).toEqual(["users"])
  })

  it("a failed connect shows the error and can retry", async () => {
    fakeServer(C.name, { failConnect: new Error("ER_ACCESS_DENIED_ERROR: Access denied for user") })

    expect(await store.dispatch("connectionTree/open", 7)).toBe(false)
    expect(connectionOf(7).status).toBe("error")
    expect(connectionOf(7).error).toMatch(/Access denied for user/)
    expect(state(C_KEY).server).toBeNull()

    fakeServer(C.name)
    received = []
    expect(await store.dispatch("connectionTree/open", 7)).toBe(true)
    expect(received.filter((r) => r.name === "conn/create")).toHaveLength(1)
    expect(connectionOf(7).status).toBe("connected")
  })

  it("a connect that fails after the server is created closes the server", async () => {
    const failing = fakeServer(C.name, { failListDatabases: new Error("permission denied to list databases") })

    expect(await store.dispatch("connectionTree/open", 7)).toBe(false)

    expect(connectionOf(7).status).toBe("error")
    expect(connectionOf(7).error).toMatch(/permission denied/)
    expect(received.filter((r) => r.name === "conn/disconnect" || r.name === "conn/clearConnection").map((r) => [r.name, r.sId])).toEqual([
      ["conn/disconnect", C_KEY],
      ["conn/clearConnection", C_KEY],
    ])
    expect(failing.end).toHaveBeenCalledTimes(1)
    expect(state(C_KEY).server).toBeNull()

    // a retry creates one server, with none left behind from the failed attempt
    fakeServer(C.name)
    received = []
    expect(await store.dispatch("connectionTree/open", 7)).toBe(true)
    expect(received.filter((r) => r.name === "conn/create")).toHaveLength(1)
  })

  it("window disconnect also closes a saved connection in error", async () => {
    fakeServer(C.name, { failConnect: new Error("connection refused") })
    await store.dispatch("connectionTree/open", 7)
    expect(connectionOf(7).status).toBe("error")
    received = []

    await store.dispatch("disconnect")

    const disconnects = received.filter((r) => r.name === "conn/disconnect").map((r) => r.sId)
    expect(disconnects).toEqual([C_KEY, W1])
    expect(store.state["connectionTree"].connections).toEqual({})
  })

  it("expanding a secondary database lists it in the child session", async () => {
    fakeServer(C.name)
    await store.dispatch("connectionTree/open", 7)
    received = []

    await store.dispatch("connectionTree/loadDatabase", { id: 7, database: "audit" })

    const lists = received.filter((r) => r.name === "conn/listTables")
    expect(lists).toEqual([{ name: "conn/listTables", sId: C_KEY, database: "audit" }])
    expect(connectionOf(7).databaseEntities.audit.tables.map((t: any) => t.name)).toEqual(["log"])
  })

  it("concurrent expands connect once", async () => {
    let release: () => void
    fakeServer(C.name, { slowConnect: new Promise<void>((r) => (release = r)) })

    const first = store.dispatch("connectionTree/open", 7)
    const second = store.dispatch("connectionTree/open", 7)
    release()
    expect(await Promise.all([first, second])).toEqual([true, true])

    expect(received.filter((r) => r.name === "conn/create")).toHaveLength(1)
  })

  it("ephemeral prompt cancel leaves the connection closed", async () => {
    fakeServer(ROACH.name)
    const prompt = vi.spyOn(BeekeeperPlugin, "promptJwtToken").mockResolvedValue({ token: null, cancelled: true } as any)

    expect(await store.dispatch("connectionTree/open", 11)).toBe(false)
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(received.filter((r) => r.name === "conn/create")).toHaveLength(0)
    expect(connectionOf(11).status).toBe("idle")

    prompt.mockResolvedValue({ token: "jwt-token", cancelled: false } as any)
    expect(await store.dispatch("connectionTree/open", 11)).toBe(true)
    const createArgs = sent.mock.calls.find(([name]) => name === "conn/create")[1]
    expect(createArgs.config.password).toBe("jwt-token")
  })

  it("disconnect closes the child session", async () => {
    fakeServer(C.name)
    await store.dispatch("connectionTree/open", 7)
    received = []

    await store.dispatch("connectionTree/disconnect", 7)

    expect(received.map((r) => [r.name, r.sId])).toEqual([
      ["conn/disconnect", C_KEY],
      ["conn/clearConnection", C_KEY],
    ])
    expect(connectionOf(7).status).toBe("idle")
    expect(connectionOf(7).databaseEntities).toEqual({})
    expect(state(C_KEY).server).toBeNull()
  })

  for (const action of ["disconnect", "rollbackConnection"]) {
    it(`window disconnect closes every secondary connection (${action})`, async () => {
      fakeServer(C.name)
      fakeServer(D.name)
      await store.dispatch("connectionTree/open", 7)
      await store.dispatch("connectionTree/open", 9)
      received = []

      await store.dispatch(action)

      const disconnects = received.filter((r) => r.name === "conn/disconnect").map((r) => r.sId)
      expect(disconnects.slice(0, 2).sort()).toEqual([C_KEY, "w1::connection::9"])
      // the window's own goes last; UtilityConnection sends it under the window's session
      expect(disconnects[2]).toBe(W1)
      expect(store.state["connectionTree"].connections).toEqual({})
    })
  }

  it("snowflake MFA prompt cancel leaves the connection closed", async () => {
    fakeServer(SNOW.name)
    const prompt = vi.spyOn(BeekeeperPlugin, "promptSnowflakeMFAPasscode").mockResolvedValue({ passcode: null, cancelled: true } as any)

    expect(await store.dispatch("connectionTree/open", 13)).toBe(false)
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(received.filter((r) => r.name === "conn/create")).toHaveLength(0)
    expect(connectionOf(13).status).toBe("idle")

    prompt.mockResolvedValue({ passcode: "123456", cancelled: false } as any)
    expect(await store.dispatch("connectionTree/open", 13)).toBe(true)
    const createArgs = sent.mock.calls.find(([name]) => name === "conn/create")[1]
    expect(createArgs.config.snowflakeOptions.passcode).toBe("123456")
  })
})
