import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// connHandlers pulls in every db client through the connection provider, which
// fails to load under jsdom. The handler plumbing doesn't need it.
vi.mock("@commercial/backend/lib/connection-provider", () => ({ default: {} }))

import { ConnHandlers } from "@commercial/backend/handlers/connHandlers"
import { connectionFor, newState, removeState, state } from "@/handlers/handlerState"
import bksConfig from "@/common/bksConfig"

const SID = "multi-db-window"

function fakeClient(name: string) {
  return {
    name,
    connectionType: "postgresql",
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    listTables: vi.fn(async () => [{ name: `${name}_table`, entityType: "table" }]),
    startTransaction: vi.fn(async () => undefined),
    rollbackTransaction: vi.fn(async () => undefined),
  }
}

/** A stand-in for createServer(): the same public API over a plain cache */
function fakeServer(active: ReturnType<typeof fakeClient>) {
  const db: Record<string, any> = { a: active }
  const tunnel = { connection: { shutdown: vi.fn() } }
  const server = {
    cache: db,
    sshTunnel: tunnel as any,
    db: (name: string) => db[name],
    createConnection: vi.fn((name: string) => {
      db[name] = fakeClient(name)
      return db[name]
    }),
    destroyConnection: vi.fn((name: string) => {
      db[name]?.disconnect()
      delete db[name]
    }),
    end: vi.fn(() => {
      Object.keys(db).forEach((k) => db[k].disconnect())
      server.sshTunnel?.connection.shutdown()
      server.sshTunnel = null
    }),
    disconnect() { return this.end() },
  }
  return server
}

describe("connectionFor", () => {
  let active: ReturnType<typeof fakeClient>
  let server: ReturnType<typeof fakeServer>

  beforeEach(() => {
    newState(SID)
    active = fakeClient("a")
    server = fakeServer(active)
    state(SID).server = server as any
    state(SID).connection = active as any
    state(SID).database = "a"
  })
  afterEach(async () => {
    vi.useRealTimers()
    await removeState(SID)
  })

  it("returns the active connection for null and the active database", async () => {
    expect(await connectionFor(SID, null)).toBe(active)
    expect(await connectionFor(SID, undefined)).toBe(active)
    expect(await connectionFor(SID, "a")).toBe(active)
    expect(server.createConnection).toHaveBeenCalledTimes(0)
  })

  it("creates a non-active client once and reuses it", async () => {
    const first = await connectionFor(SID, "b")
    const second = await connectionFor(SID, "b")
    expect(first).toBe(second)
    expect(first).not.toBe(active)
    expect(server.createConnection).toHaveBeenCalledTimes(1)
    expect(server.createConnection).toHaveBeenCalledWith("b")
    expect((first as any).connect).toHaveBeenCalledTimes(1)
  })

  it("creates a non-active client once when two calls race", async () => {
    const [first, second] = await Promise.all([connectionFor(SID, "b"), connectionFor(SID, "b")])
    expect(first).toBe(second)
    expect(server.createConnection).toHaveBeenCalledTimes(1)
  })

  it("failed connect drops the client and rethrows", async () => {
    const error = new Error("permission denied for database b")
    server.createConnection.mockImplementationOnce((name: string) => {
      const client = fakeClient(name)
      client.connect.mockRejectedValueOnce(error)
      server.cache[name] = client
      return client
    })
    await expect(connectionFor(SID, "b")).rejects.toBe(error)
    expect(server.cache["b"]).toBeUndefined()
  })

  it("conn handlers route by database", async () => {
    await connectionFor(SID, "b")
    const tables = await ConnHandlers["conn/listTables"]({ sId: SID, database: "b" })
    expect(tables).toEqual([{ name: "b_table", entityType: "table" }])
    expect(server.cache["b"].listTables).toHaveBeenCalledTimes(1)
    expect(active.listTables).toHaveBeenCalledTimes(0)

    await ConnHandlers["conn/listTables"]({ sId: SID })
    expect(active.listTables).toHaveBeenCalledTimes(1)
  })

  it("conn/disconnect ends every cached client and the tunnel", async () => {
    await connectionFor(SID, "b")
    const b = server.cache["b"]
    await ConnHandlers["conn/disconnect"]({ sId: SID })
    expect(active.disconnect).toHaveBeenCalledTimes(1)
    expect(b.disconnect).toHaveBeenCalledTimes(1)
    expect(server.sshTunnel).toBeNull()
  })

  it("transaction timeout rolls back on the starting client", async () => {
    vi.useFakeTimers()
    state(SID).port = { postMessage: vi.fn() } as any
    await ConnHandlers["conn/startTransaction"]({ tabId: 7, sId: SID, database: "b" })
    const b = server.cache["b"]
    expect(b.startTransaction).toHaveBeenCalledWith(7)

    const cfg = bksConfig.db.postgres
    await vi.advanceTimersByTimeAsync(cfg.manualTransactionTimeout + 1)

    expect(b.rollbackTransaction).toHaveBeenCalledWith(7)
    expect(active.rollbackTransaction).toHaveBeenCalledTimes(0)
  })
})
