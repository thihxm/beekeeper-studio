import { Transport } from ".";

/** The color of one database of a saved connection */
export interface TransportDatabaseLabel extends Transport {
  connectionId: number,
  workspaceId: number,
  databaseName: string,
  color: string,
}
