import { describe, it, expect, vi, beforeEach } from "vitest"
import Vue from "vue"
import { ElectronUtilityConnectionClient } from "@/lib/utility/ElectronUtilityConnectionClient"

const CALLS: [string, (c: ElectronUtilityConnectionClient) => Promise<any>][] = [
  ["conn/listTables", (c) => c.listTables(null)],
  ["conn/listViews", (c) => c.listViews(null)],
  ["conn/listRoutines", (c) => c.listRoutines(null)],
  ["conn/query", (c) => c.query("select 1", 3)],
]

describe("ElectronUtilityConnectionClient", () => {
  let send: ReturnType<typeof vi.fn>

  beforeEach(() => {
    send = vi.fn(async () => "query-id")
    Vue.prototype.$util = { send }
  })

  it("forDatabase injects database on every call", async () => {
    const client = new ElectronUtilityConnectionClient().forDatabase("b")
    for (const [handler, call] of CALLS) {
      send.mockClear()
      await call(client)
      expect(send).toHaveBeenCalledTimes(1)
      expect(send.mock.calls[0][0]).toBe(handler)
      expect(send.mock.calls[0][1]).toMatchObject({ database: "b" })
    }
  })

  it("default client sends no database", async () => {
    const client = new ElectronUtilityConnectionClient()
    for (const [handler, call] of CALLS) {
      send.mockClear()
      await call(client)
      expect(send.mock.calls[0][0]).toBe(handler)
      expect(send.mock.calls[0][1]).not.toHaveProperty("database")
    }
  })
})
