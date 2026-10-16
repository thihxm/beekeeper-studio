import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers"
import { dbtimeout } from "@tests/lib/db"
import { createServer } from "@commercial/backend/lib/db/server"
import { connectionFor, newState, removeState, state } from "@/handlers/handlerState"
import { IDbConnectionServerConfig } from "@/lib/db/types"

const SID = "multi-database-integration"

describe("multiple databases on one Postgres server", () => {
  vi.setConfig({ testTimeout: dbtimeout, hookTimeout: dbtimeout * 2 })

  let container: StartedTestContainer
  let server: ReturnType<typeof createServer>

  beforeAll(async () => {
    container = await new GenericContainer("postgres:16")
      .withEnvironment({ POSTGRES_PASSWORD: "example", POSTGRES_DB: "a" })
      .withWaitStrategy(Wait.forLogMessage("database system is ready to accept connections", 2))
      .withExposedPorts(5432)
      .withStartupTimeout(dbtimeout * 2)
      .start()

    const config = {
      client: "postgresql",
      host: container.getHost(),
      port: container.getMappedPort(5432),
      user: "postgres",
      password: "example",
      osUser: "foo",
      ssh: null,
      ssl: false,
      sslRejectUnauthorized: false,
      socketPathEnabled: false,
      readOnlyMode: false,
    } as unknown as IDbConnectionServerConfig

    server = createServer(config)
    const a = server.createConnection("a")
    await a.connect()
    await a.executeQuery("CREATE TABLE ta (id int)")
    await a.executeQuery("CREATE DATABASE b")

    const setupB = server.createConnection("b")
    await setupB.connect()
    await setupB.executeQuery("CREATE TABLE tb (id int)")
    server.destroyConnection("b")

    newState(SID)
    state(SID).server = server
    state(SID).connection = a
    state(SID).database = "a"
  })

  afterAll(async () => {
    server?.end()
    await removeState(SID)
    await container?.stop()
  })

  it("lists tables of a non-active database", async () => {
    const b = await connectionFor(SID, "b")
    const names = (await b.listTables()).map((t) => t.name)

    expect(names).toContain("tb")
    expect(names).not.toContain("ta")
    expect(state(SID).database).toBe("a")
    const activeNames = (await state(SID).connection.listTables()).map((t) => t.name)
    expect(activeNames).toContain("ta")
  })
})
