import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("@commercial/backend/lib/connection-provider", () => ({ default: {} }))

import { ConnHandlers } from "@commercial/backend/handlers/connHandlers"
import { QueryHandlers } from "@/handlers/queryHandlers"
import { CLIENT_SWEEP_INTERVAL, connectionFor, newState, removeState, state } from "@/handlers/handlerState"
import bksConfig from "@/common/bksConfig"

const SID = "client-lifecycle-window"

function fakeClient(name: string) {
  return {
    name,
    connectionType: "postgresql",
    reservedConnections: new Map(),
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    listTables: vi.fn(async () => [{ name: `${name}_table` }]),
    startTransaction: vi.fn(async () => undefined),
    query: vi.fn(),
  }
}

function fakeServer(active: ReturnType<typeof fakeClient>) {
  const db: Record<string, any> = { a: active }
  const server = {
    cache: db,
    sshTunnel: { connection: { shutdown: vi.fn() } } as any,
    db: (name: string) => db[name],
    createConnection: vi.fn((name: string) => (db[name] = fakeClient(name))),
    destroyConnection: vi.fn((name: string) => {
      db[name]?.disconnect()
      delete db[name]
    }),
    end: vi.fn(() => {
      Object.keys(db).forEach((k) => db[k].disconnect())
      server.sshTunnel = null
    }),
  }
  return server
}

describe("non-default database client lifecycle", () => {
  const cfg = bksConfig.db.postgres
  const original = { max: cfg.maxOpenDatabases, idle: cfg.idleDatabaseTimeout }
  let active: ReturnType<typeof fakeClient>
  let server: ReturnType<typeof fakeServer>

  beforeEach(() => {
    vi.useFakeTimers()
    cfg.maxOpenDatabases = 2
    cfg.idleDatabaseTimeout = 5000
    newState(SID)
    active = fakeClient("a")
    server = fakeServer(active)
    state(SID).server = server as any
    state(SID).connection = active as any
    state(SID).database = "a"
    state(SID).port = { postMessage: vi.fn() } as any
  })

  afterEach(async () => {
    await removeState(SID)
    cfg.maxOpenDatabases = original.max
    cfg.idleDatabaseTimeout = original.idle
    vi.useRealTimers()
  })

  it("evicts the least recently used idle client at the limit", async () => {
    await connectionFor(SID, "b")
    vi.advanceTimersByTime(10)
    await connectionFor(SID, "c")
    const b = server.cache["b"]

    await connectionFor(SID, "d")

    expect(b.disconnect).toHaveBeenCalledTimes(1)
    expect(server.cache["b"]).toBeUndefined()
    expect(server.cache["c"]).toBeDefined()
    expect(server.cache["d"]).toBeDefined()
    expect(server.destroyConnection.mock.invocationCallOrder[0])
      .toBeLessThan(server.createConnection.mock.invocationCallOrder[2])
  })

  it("rejects at the limit when no client is idle", async () => {
    const b = await connectionFor(SID, "b") as any
    const c = await connectionFor(SID, "c") as any
    b.reservedConnections.set(1, {})
    c.reservedConnections.set(2, {})

    await expect(connectionFor(SID, "d")).rejects.toThrow(/2/)
    expect(server.createConnection).not.toHaveBeenCalledWith("d")
  })

  it("sweep disconnects clients idle past the timeout", async () => {
    await connectionFor(SID, "b")
    await connectionFor(SID, "c")
    const b = server.cache["b"]
    const c = server.cache["c"]
    // last uses as seen from the moment the next sweep runs
    const sweepAt = Date.now() + CLIENT_SWEEP_INTERVAL
    state(SID).clientLastUsed.set("b", sweepAt - 5001)
    state(SID).clientLastUsed.set("c", sweepAt - 4000)

    vi.advanceTimersByTime(CLIENT_SWEEP_INTERVAL)

    expect(b.disconnect).toHaveBeenCalledTimes(1)
    expect(server.cache["b"]).toBeUndefined()
    expect(c.disconnect).not.toHaveBeenCalled()
    expect(server.cache["c"]).toBe(c)
  })

  it("never evicts active reserved or in-transaction clients", async () => {
    cfg.maxOpenDatabases = 3
    const b = await connectionFor(SID, "b") as any
    await ConnHandlers["conn/startTransaction"]({ tabId: 9, sId: SID, database: "c" })
    const c = server.cache["c"]
    b.reservedConnections.set(1, {})
    state(SID).clientLastUsed.set("b", 0)
    state(SID).clientLastUsed.set("c", 0)
    state(SID).clientLastUsed.set("a", 0)

    vi.advanceTimersByTime(CLIENT_SWEEP_INTERVAL * 2)

    expect(active.disconnect).not.toHaveBeenCalled()
    expect(b.disconnect).not.toHaveBeenCalled()
    expect(c.disconnect).not.toHaveBeenCalled()

    cfg.maxOpenDatabases = 2
    await expect(connectionFor(SID, "d")).rejects.toThrow(/2/)
    expect(active.disconnect).not.toHaveBeenCalled()
  })

  it("an evicted database is recreated on next use", async () => {
    await connectionFor(SID, "b")
    state(SID).clientLastUsed.set("b", Date.now() - 6000)
    vi.advanceTimersByTime(CLIENT_SWEEP_INTERVAL)
    expect(server.cache["b"]).toBeUndefined()

    const tables = await ConnHandlers["conn/listTables"]({ sId: SID, database: "b" })

    expect(server.createConnection).toHaveBeenCalledTimes(2)
    expect(tables).toEqual([{ name: "b_table" }])
  })

  it("disconnect clears the sweep timer", async () => {
    await connectionFor(SID, "b")
    await ConnHandlers["conn/disconnect"]({ sId: SID })
    const disconnects = () => Object.values(server.cache).reduce((n, c: any) => n + c.disconnect.mock.calls.length, 0)
    const before = disconnects()
    server.destroyConnection.mockClear()

    vi.advanceTimersByTime(CLIENT_SWEEP_INTERVAL * 10)

    expect(server.destroyConnection).not.toHaveBeenCalled()
    expect(disconnects()).toBe(before)
    expect(state(SID).clientSweep).toBeNull()
  })

  it("eviction keeps the ssh tunnel", async () => {
    const tunnel = server.sshTunnel
    await connectionFor(SID, "b")
    await connectionFor(SID, "c")
    await connectionFor(SID, "d") // limit eviction of b
    state(SID).clientLastUsed.set("c", 0)
    vi.advanceTimersByTime(CLIENT_SWEEP_INTERVAL) // sweep eviction of c

    expect(server.destroyConnection).toHaveBeenCalledWith("b")
    expect(server.destroyConnection).toHaveBeenCalledWith("c")
    expect(server.sshTunnel).toBe(tunnel)
    expect(tunnel.connection.shutdown).not.toHaveBeenCalled()
  })

  it("parallel opens of different databases respect the limit", async () => {
    // b is idle, then c and d start connecting at the same time
    await connectionFor(SID, "b")
    await Promise.all([connectionFor(SID, "c"), connectionFor(SID, "d")])

    const open = Object.keys(server.cache).filter((k) => k !== "a")
    expect(open.length).toBeLessThanOrEqual(2)
  })

  it("a client running a query is not evicted", async () => {
    let finish: (rows: any[]) => void
    const b = await connectionFor(SID, "b") as any
    b.query.mockResolvedValue({ execute: () => new Promise((res) => { finish = res }), cancel: vi.fn() })
    const queryId = await ConnHandlers["conn/query"]({ queryText: "select pg_sleep(600)", tabId: 4, hasActiveTransaction: false, sId: SID, database: "b" })
    const running = QueryHandlers["query/execute"]({ queryId, sId: SID })

    state(SID).clientLastUsed.set("b", 0)
    vi.advanceTimersByTime(CLIENT_SWEEP_INTERVAL)
    expect(b.disconnect).not.toHaveBeenCalled()

    finish([])
    await running
    // idle time restarts when the query ends
    expect(Date.now() - state(SID).clientLastUsed.get("b")).toBeLessThan(1000)
  })
})
