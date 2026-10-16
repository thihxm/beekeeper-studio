import { IConnection } from "@/common/interfaces/IConnection";
import { CloudClient } from "@/lib/cloud/CloudClient";
import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient";
import { CancelableQuery } from "@/lib/db/models";
import { IDbConnectionPublicServer } from "@/lib/db/serverTypes";
import { Export } from "@/lib/export";
import ImportClass from "@/lib/import"
import { SqlGenerator } from "@shared/lib/sql/SqlGenerator";
import { ChildProcessWithoutNullStreams } from "child_process";
import { MessagePortMain } from "electron";
import { FSWatcher } from "fs";
import fs from "fs";
import tmp from 'tmp';
import bksConfig from "@/common/bksConfig";
import rawLog from "@bksLogger";

const log = rawLog.scope("handlerState");

/** How often idle non-default database clients are looked for */
export const CLIENT_SWEEP_INTERVAL = 60_000;

export interface TempFile {
  fileObject: tmp.FileResult,
  fileHandle: fs.promises.FileHandle
}

class State {
  port: MessagePortMain = null
  server: IDbConnectionPublicServer = null;
  usedConfig: IConnection = null;
  connection: BasicDatabaseClient<any, any> = null;
  transactionTimeouts: Map<number, NodeJS.Timeout> = new Map();
  /** the client each tab's open transaction runs on */
  transactionClients: Map<number, BasicDatabaseClient<any, any>> = new Map();
  database: string = null;
  /** connects in flight for non-active databases, keyed like server.db */
  pendingClients: Map<string, Promise<BasicDatabaseClient<any, any>>> = new Map();
  /** last use of each non-active database client, keyed like server.db */
  clientLastUsed: Map<string, number> = new Map();
  /** the client each pending query (by query id) runs on */
  queryClients: Map<string, BasicDatabaseClient<any, any>> = new Map();
  clientSweep: NodeJS.Timeout = null;
  username: string = null;
  queries: Map<string, CancelableQuery> = new Map();
  generator: SqlGenerator = null;
  exports: Map<string, Export> = new Map();
  imports: Map<string, ImportClass> = new Map();
  backupProc: ChildProcessWithoutNullStreams = null;

  cloudClient: CloudClient = null;
  workspaceId: number = null;

  connectionAbortController: AbortController = null;

  // enums
  enumsInitialized = false;

  private enumWatcher: FSWatcher = null;

  set watcher(value: FSWatcher) {
    if (this.enumWatcher != null) this.enumWatcher.close();
    this.enumWatcher = value;
  }

  // temp files
  tempFiles: Map<string, TempFile> = new Map();
}

const states = new Map<string, State>();

// I kinda hate this tbh. modifying could be scary
export function state(id: string): State {
  return states.get(id);
}

export function newState(id: string): void {
  states.set(id, new State());
}

export async function removeState(id: string): Promise<void> {
  const state = states.get(id);
  if (!state) return;
  for (const file of state.tempFiles.values()) {
    if (file.fileHandle) {
      await file.fileHandle.close().catch();
    }

    if (file.fileObject) {
      try {
        file.fileObject.removeCallback()
      } catch {}
    }
  }
  state.tempFiles.clear();
  stopClientSweep(id);
  states.delete(id);
}

export const errorMessages = {
  noUsername: 'No username provided',
  noGenerator: 'No sql generator found',
  noDatabase: 'No database connection found',
  noServer: 'No server found',
  noQuery: 'Query not found',
  noExport: 'Export not found',
  noImport: 'Import not found'
};

export function getDriverHandler(name: string) {
  return async function({ sId, database }: { sId: string, database?: string }): Promise<any> {
    const connection = await connectionFor(sId, database);
    return await connection[name]();
  }
}

/**
 * Resolve the client for one database of the current server. The active
 * database (or no database) is `state.connection`; any other database gets its
 * own client from the server cache, created and connected on first use.
 */
export async function connectionFor(sId: string, database?: string | null): Promise<BasicDatabaseClient<any, any>> {
  checkConnection(sId);
  const s = state(sId);
  if (database == null || database === s.database) return s.connection;
  if (!s.server) {
    throw new Error(errorMessages.noServer);
  }

  const pending = s.pendingClients.get(database);
  if (pending) return await pending;

  const cached = s.server.db(database);
  if (cached) {
    s.clientLastUsed.set(database, Date.now());
    return cached;
  }

  const connecting = (async () => {
    makeRoomForClient(sId);
    const client = s.server.createConnection(database);
    try {
      await client.connect();
    } catch (e) {
      s.server.destroyConnection(database);
      throw e;
    }
    client.connectionType = s.connection.connectionType;
    s.clientLastUsed.set(database, Date.now());
    startClientSweep(sId);
    return client;
  })();
  s.pendingClients.set(database, connecting);
  try {
    return await connecting;
  } finally {
    s.pendingClients.delete(database);
  }
}

export function checkConnection(sId: string) {
  if (!state(sId).connection) {
    throw new Error(errorMessages.noDatabase);
  }
}


function dbConfig(sId: string) {
  let connectionType: string = state(sId).connection?.connectionType;
  connectionType = connectionType === 'postgresql' ? 'postgres' : connectionType;
  return bksConfig.db[connectionType] ?? bksConfig.db.default;
}

/** A client in use: a reserved connection, an open transaction or a query runs on it */
function clientBusy(sId: string, client: BasicDatabaseClient<any, any>): boolean {
  if (client.reservedConnections?.size > 0) return true;
  if ([...state(sId).queryClients.values()].includes(client)) return true;
  return [...state(sId).transactionClients.values()].includes(client);
}

/** Restart the idle clock of a non-active client, eg when a long query ends */
export function touchClient(sId: string, client: BasicDatabaseClient<any, any>) {
  const s = state(sId);
  if (!s?.server) return;
  for (const database of s.clientLastUsed.keys()) {
    if (s.server.db(database) === client) s.clientLastUsed.set(database, Date.now());
  }
}

/** Close a non-active database client; the next connectionFor recreates it */
function evictClient(sId: string, database: string) {
  const s = state(sId);
  log.info(`Closing the client of database ${database}`);
  s.clientLastUsed.delete(database);
  s.server.destroyConnection(database);
}

function evictableClients(sId: string): string[] {
  const s = state(sId);
  return [...s.clientLastUsed.keys()].filter((database) => {
    const client = s.server.db(database);
    return client && client !== s.connection && database !== s.database && !clientBusy(sId, client);
  });
}

/** Keep the non-active clients under maxOpenDatabases before opening another one */
function makeRoomForClient(sId: string) {
  const s = state(sId);
  const max: number = dbConfig(sId).maxOpenDatabases;
  const open = [...s.clientLastUsed.keys()].filter((database) => {
    const client = s.server.db(database);
    return client && client !== s.connection && database !== s.database;
  });
  // clients still connecting count too, so parallel opens can't pass the limit
  if (open.length + s.pendingClients.size < max) return;

  const [leastRecent] = evictableClients(sId)
    .sort((x, y) => s.clientLastUsed.get(x) - s.clientLastUsed.get(y));
  if (!leastRecent) {
    throw new Error(`Too many open databases: the limit is ${max} (maxOpenDatabases), and every open database is in use.`);
  }
  evictClient(sId, leastRecent);
}

/** Close non-active clients idle for longer than idleDatabaseTimeout */
export function sweepIdleClients(sId: string) {
  const s = state(sId);
  if (!s?.server) return;
  const timeout: number = dbConfig(sId).idleDatabaseTimeout;
  const now = Date.now();
  for (const database of evictableClients(sId)) {
    if (now - s.clientLastUsed.get(database) > timeout) {
      evictClient(sId, database);
    }
  }
}

export function startClientSweep(sId: string) {
  const s = state(sId);
  if (s.clientSweep) return;
  s.clientSweep = setInterval(() => sweepIdleClients(sId), CLIENT_SWEEP_INTERVAL);
}

export function stopClientSweep(sId: string) {
  const s = state(sId);
  if (!s) return;
  if (s.clientSweep) clearInterval(s.clientSweep);
  s.clientSweep = null;
  s.clientLastUsed.clear();
}
