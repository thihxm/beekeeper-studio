export default {
  name: "20261016_create_database_labels",
  async run(runner) {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS database_labels (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "connectionId" integer NOT NULL,
        "workspaceId" integer NOT NULL DEFAULT -1,
        "databaseName" varchar(255) NOT NULL,
        "color" varchar(255) NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        "version" integer NOT NULL DEFAULT 0
      )
    `)
    await runner.query(`CREATE UNIQUE INDEX database_labels_connection_database ON database_labels (connectionId, workspaceId, databaseName)`)
  }
}
