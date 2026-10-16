import { describe, it, expect, vi } from "vitest"

// The real client registry loads every driver; the cache only needs a factory.
vi.mock("@commercial/backend/lib/db/client", () => ({
  createConnection: vi.fn((server, database) => ({
    server,
    database,
    disconnect: vi.fn(async () => undefined),
  })),
}))
vi.mock("@/lib/db/clients", () => ({
  findClient: (name: string) => ({ name, supportsSocketPath: false }),
}))

import { createServer } from "@commercial/backend/lib/db/server"
import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient"

// BasicDatabaseClient is abstract; disconnect() is the only member under test
class OneDatabaseClient extends (BasicDatabaseClient as any) {}

describe("server client cache", () => {
  it("disconnecting one client keeps the ssh tunnel", async () => {
    const shutdown = vi.fn()
    const server: any = {
      db: {},
      config: { client: "postgresql" },
      sshTunnel: { connection: { shutdown } },
    }
    const client: any = new OneDatabaseClient(null, null, server, { database: "b" })
    server.db.b = client

    await client.disconnect()

    expect(server.sshTunnel).not.toBeNull()
    expect(shutdown).not.toHaveBeenCalled()
  })

  it("surrealdb client is cached under ns::db", () => {
    const server = createServer({ client: "surrealdb" } as any)
    const first = server.createConnection("ns::db")
    const second = server.createConnection("ns::db")

    expect(second).toBe(first)
    expect(server.db("ns::db")).toBe(first)
    expect((first as any).database).toMatchObject({ database: "db", namespace: "ns" })
  })
})
