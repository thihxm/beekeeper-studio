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
})
