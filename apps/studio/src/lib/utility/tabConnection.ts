import { ElectronUtilityConnectionClient } from "./ElectronUtilityConnectionClient";

/**
 * The client a tab runs on: the default connection when the tab has no
 * database or is bound to the default one, otherwise a client routed to the
 * tab's database. `serverKey` maps a database name to the key the utility
 * caches its client under (`ns::db` for SurrealDB).
 */
export function connectionForTab(
  connection: ElectronUtilityConnectionClient,
  tab: { databaseName?: string | null } | null | undefined,
  defaultDatabase: string | null = null,
  serverKey: (database: string) => string = (database) => database
): ElectronUtilityConnectionClient {
  const database = tab?.databaseName;
  if (database == null || database === defaultDatabase) return connection;
  return connection.forDatabase(serverKey(database));
}
