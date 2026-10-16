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
  if (cached) return cached;

  const connecting = (async () => {
    const client = s.server.createConnection(database);
    try {
      await client.connect();
    } catch (e) {
      s.server.destroyConnection(database);
      throw e;
    }
    client.connectionType = s.connection.connectionType;
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

