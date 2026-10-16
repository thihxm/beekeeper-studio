import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers"
import { dbtimeout } from "@tests/lib/db"
import { createServer } from "@commercial/backend/lib/db/server"
import { IDbConnectionServerConfig } from "@/lib/db/types"

// The boundary proof for SQLServerClient.listInaccessibleDatabases: a real
// server, a login mapped into one database and not into another.
describe("SQL Server databases the login cannot open", () => {
  vi.setConfig({ testTimeout: dbtimeout, hookTimeout: dbtimeout * 2 })

  let container: StartedTestContainer
  let baseConfig: IDbConnectionServerConfig

  beforeAll(async () => {
    container = await new GenericContainer("mcr.microsoft.com/mssql/server:2019-latest")
      .withEnvironment({
        MSSQL_PID: "Express",
        SA_PASSWORD: "Example*1",
        MSSQL_SA_PASSWORD: "Example*1",
        ACCEPT_EULA: "Y",
      })
      .withExposedPorts(1433)
      .withWaitStrategy(Wait.forLogMessage("SQL Server is now ready for client connections."))
      .withStartupTimeout(dbtimeout * 2)
      .start()

    baseConfig = {
      client: "sqlserver",
      host: container.getHost(),
      port: container.getMappedPort(1433),
      user: "sa",
      password: "Example*1",
      trustServerCertificate: true,
      readOnlyMode: false,
    } as IDbConnectionServerConfig

    const admin = createServer(baseConfig)
    try {
      const master = admin.createConnection("master")
      await master.connect()
      await master.executeQuery("CREATE DATABASE secret")
      await master.executeQuery("CREATE DATABASE open_db")
      await master.executeQuery("CREATE LOGIN limited WITH PASSWORD = 'Limited*Pass1', CHECK_POLICY = OFF")
      const openDb = admin.createConnection("open_db")
      await openDb.connect()
      await openDb.executeQuery("CREATE USER limited FOR LOGIN limited")
    } finally {
      admin.end()
    }
  })

  afterAll(async () => {
    await container?.stop()
  })

  it("sql server lists databases the login has no access to", async () => {
    const limited = createServer({ ...baseConfig, user: "limited", password: "Limited*Pass1" } as IDbConnectionServerConfig)
    try {
      const client = limited.createConnection("master")
      await client.connect()
      const inaccessible = await client.listInaccessibleDatabases()

      expect(inaccessible).toContain("secret")
      expect(inaccessible).not.toContain("open_db")
      expect(inaccessible).not.toContain("master")
    } finally {
      limited.end()
    }
  })
})
