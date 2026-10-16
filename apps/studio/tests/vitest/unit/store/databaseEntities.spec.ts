import { describe, it, expect, vi, beforeEach } from "vitest"
import Vue from "vue"
import store from "@/store"

// The store reaches the utility through $util.send; a non-default database's
// calls carry `database`. Each handler answers per database.
const ENTITIES: Record<string, any> = {
  "conn/listTables": { b: [{ name: "orders", schema: "public" }] },
  "conn/listViews": { b: [{ name: "orders_view", schema: "public" }] },
  "conn/listMaterializedViews": { b: [] },
  "conn/listRoutines": { b: [] },
}

let send: ReturnType<typeof vi.fn>

function deferred() {
  let resolve: (v: any) => void
  let reject: (e: any) => void
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

describe("databaseEntities", () => {
  beforeEach(() => {
    send = vi.fn(async (channel: string, args: any = {}) => {
      return ENTITIES[channel]?.[args.database] ?? []
    })
    Vue.prototype.$util = { send }
    window.main = {
      enableConnectionMenuItems: vi.fn(),
      disableConnectionMenuItems: vi.fn(),
      setWindowTitle: vi.fn(),
    } as any
    store.commit("clearConnection")
    store.commit("database", "a")
    store.commit("databaseList", ["a", "b"])
  })

  it("loads a database once and caches it", async () => {
    await store.dispatch("loadDatabaseEntities", { database: "b" })
    await store.dispatch("loadDatabaseEntities", { database: "b" })

    const listTables = send.mock.calls.filter(([channel]) => channel === "conn/listTables")
    expect(listTables).toHaveLength(1)
    expect(listTables[0][1]).toMatchObject({ database: "b" })
    expect(store.state.databaseEntities.b.status).toBe("loaded")
    expect(store.getters.tablesFor("b").map((t) => t.name)).toEqual(["orders", "orders_view"])
  })

  it("tracks loading and error status", async () => {
    const pending = deferred()
    send.mockImplementation(async (channel: string) => {
      if (channel === "conn/listTables") return pending.promise
      return []
    })

    const loading = store.dispatch("loadDatabaseEntities", { database: "b" })
    expect(store.state.databaseEntities.b.status).toBe("loading")

    pending.reject(new Error("permission denied for database b"))
    await loading

    expect(store.state.databaseEntities.b.status).toBe("error")
    expect(store.state.databaseEntities.b.error).toBe("permission denied for database b")
  })

  it("disconnect clears databaseEntities", async () => {
    await store.dispatch("loadDatabaseEntities", { database: "b" })
    expect(Object.keys(store.state.databaseEntities)).toEqual(["b"])

    // refreshConnections at the end of disconnect hits unregistered data modules,
    // which vuex reports and skips
    await store.dispatch("disconnect")

    expect(store.state.databaseEntities).toEqual({})
  })

  it("loads columns of another database's table from that database, in place", async () => {
    await store.dispatch("loadDatabaseEntities", { database: "b" })
    const orders = store.getters.tablesFor("b").find((t) => t.name === "orders")
    const defaultTables = store.state.tables.length
    send.mockImplementation(async (channel: string, args: any = {}) => {
      if (channel === "conn/listTableColumns") return [{ columnName: "id", dataType: "int" }]
      return []
    })

    await store.dispatch("updateDatabaseTableColumns", { database: "b", table: orders })

    const call = send.mock.calls.find(([channel]) => channel === "conn/listTableColumns")
    expect(call[1]).toMatchObject({ table: "orders", database: "b" })
    // same object the open tab holds, now with columns
    expect(store.getters.tablesFor("b").find((t) => t.name === "orders")).toBe(orders)
    expect(orders.columns).toEqual([{ columnName: "id", dataType: "int" }])
    expect(store.state.tables).toHaveLength(defaultTables)
  })

  it("lists tables, views and materialized views at once, before routines", async () => {
    const pending: Record<string, ReturnType<typeof deferred>> = {}
    send.mockImplementation((channel: string) => {
      pending[channel] = deferred()
      return pending[channel].promise
    })

    const loading = store.dispatch("loadDatabaseEntities", { database: "b" })
    await Promise.resolve()
    expect(Object.keys(pending).sort()).toEqual(["conn/listMaterializedViews", "conn/listTables", "conn/listViews"])

    pending["conn/listTables"].resolve([{ name: "orders", schema: "public" }])
    pending["conn/listViews"].resolve([])
    pending["conn/listMaterializedViews"].resolve([])
    await new Promise((r) => setTimeout(r, 0))

    // tables show while routines are still loading
    expect(store.state.databaseEntities.b.status).toBe("loaded")
    expect(store.getters.tablesFor("b").map((t) => t.name)).toEqual(["orders"])
    pending["conn/listRoutines"].resolve([{ name: "fn", schema: "public" }])
    await loading
    expect(store.getters.routinesFor("b").map((r) => r.name)).toEqual(["fn"])
  })
})
