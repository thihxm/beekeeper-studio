import { describe, it, expect, beforeEach, vi } from "vitest"
import Vue from "vue"
import Vuex from "vuex"
import { TabModule } from "@/store/modules/TabModule"
import { TransportOpenTab } from "@/common/transport/TransportOpenTab"
import { ElectronUtilityConnectionClient } from "@/lib/utility/ElectronUtilityConnectionClient"
import { connectionForTab } from "@/lib/utility/tabConnection"
import CoreTabs from "@/components/CoreTabs.vue"
import store from "@/store"

Vue.use(Vuex)

const SAVED_CONFIG = { id: 3, name: "Prod", connectionType: "postgresql", workspaceId: -1 }

let sent: { channel: string; args: any }[]

function send(answers: Record<string, any> = {}) {
  return vi.fn(async (channel: string, args: any = {}) => {
    sent.push({ channel, args })
    if (channel === "appdb/tabs/save" && !Array.isArray(args.obj)) return { ...args.obj, id: 42 }
    if (channel in answers) return answers[channel](args)
    return args?.obj ?? []
  })
}

function tabStore(database: string) {
  return new Vuex.Store<any>({
    state: { workspaceId: -1, usedConfig: SAVED_CONFIG, database },
    modules: { tabs: TabModule },
  })
}

// CoreTabs is a Vue.extend constructor; its options hold the methods
const coreTabsMethods = (CoreTabs as any).options?.methods ?? (CoreTabs as any).methods

/** Run a CoreTabs method against a minimal component context */
function coreTabsContext(database: string) {
  const added: TransportOpenTab[] = []
  return {
    added,
    ctx: {
      tabItems: [],
      $store: { state: { database }, dispatch: vi.fn() },
      addTab: vi.fn(async (tab: TransportOpenTab) => { added.push(tab) }),
    },
  }
}

beforeEach(() => {
  sent = []
  Vue.prototype.$util = { send: send() }
})

describe("tabs bound to a database", () => {
  it("table tab from another database persists databaseName", async () => {
    const table = { name: "orders", schema: "public", entityType: "table" }
    const { ctx, added } = coreTabsContext("a")
    await coreTabsMethods.openTable.call(ctx, { table, database: "b" })
    await coreTabsMethods.openTableProperties.call(ctx, { table, database: "b" })

    expect(added.map((t) => [t.tabType, t.databaseName])).toEqual([["table", "b"], ["table-properties", "b"]])

    const tabs = tabStore("a")
    await tabs.dispatch("tabs/add", { item: added[0], endOfPosition: true })
    const saved = sent.find((s) => s.channel === "appdb/tabs/save")
    expect(saved.args.obj.databaseName).toBe("b")
  })

  it("tab connection follows databaseName", async () => {
    const util = send()
    Vue.prototype.$util = { send: util }
    const connection = new ElectronUtilityConnectionClient()

    const bound = connectionForTab(connection, { databaseName: "b" }, "a")
    await bound.listTables(null)
    expect(util.mock.calls[0][1]).toMatchObject({ database: "b" })

    expect(connectionForTab(connection, { databaseName: null }, "a")).toBe(connection)
    expect(connectionForTab(connection, { databaseName: "a" }, "a")).toBe(connection)
  })

  it("new query tab binds the default database", async () => {
    const tabs = tabStore("a")
    const item = { tabType: "query", title: "Query #1", unsavedChanges: false } as TransportOpenTab
    await tabs.dispatch("tabs/add", { item, endOfPosition: true })

    const saved = sent.find((s) => s.channel === "appdb/tabs/save")
    expect(saved.args.obj.databaseName).toBe("a")
  })

  it("bound tabs survive a default database change", async () => {
    const util = send({
      "conn/listTables": (args) => (args.database === "b" ? [{ name: "orders", schema: "public" }] : []),
    })
    Vue.prototype.$util = { send: util }
    store.commit("clearConnection")
    store.commit("database", "a")
    store.commit("databaseList", ["a", "b", "c"])
    await store.dispatch("loadDatabaseEntities", { database: "b" })

    await store.dispatch("changeDatabase", "c")
    expect(store.state.database).toBe("c")

    expect(store.getters.tablesFor("b").map((t) => t.name)).toEqual(["orders"])
    util.mockClear()
    await store.getters.connectionFor("b").listTables(null)
    expect(util.mock.calls[0][1]).toMatchObject({ database: "b" })
  })
})
