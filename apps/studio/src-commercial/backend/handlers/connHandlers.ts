import { UserSetting } from "@/common/appdb/models/user_setting";
import { IConnection } from "@/common/interfaces/IConnection";
import { DatabaseFilterOptions, ExtendedTableColumn, FieldDescriptor, FieldEditData, FilterOptions, NgQueryResult, OrderBy, PrimaryKeyColumn, Routine, SchemaFilterOptions, StreamResults, SupportedFeatures, TableChanges, TableColumn, TableFilter, TableIndex, TableInsert, TableOrView, TablePartition, TableProperties, TableResult, TableTrigger, TableUpdateResult } from "@/lib/db/models";
import { DatabaseElement, IDbConnectionServerConfig } from "@/lib/db/types";
import { AlterPartitionsSpec, AlterTableSpec, CreateTableSpec, dialectFor, IndexAlterations, RelationAlterations, TableKey } from "@shared/lib/dialects/models";
import { connectionFor, errorMessages, getDriverHandler, state } from "@/handlers/handlerState";
import ConnectionProvider from '../lib/connection-provider';
import { uuidv4 } from "@/lib/uuid";
import { SqlGenerator } from "@shared/lib/sql/SqlGenerator";
import { TokenCache } from "@/common/appdb/models/token_cache";
import { SavedConnection } from "@/common/appdb/models/saved_connection";
import { UsedConnection } from "@/common/appdb/models/used_connection";
import { AzureAuthService } from "@/lib/db/authentication/azure";
import bksConfig from "@/common/bksConfig";
import { UserPin } from "@/common/appdb/models/UserPin";
import { waitPromise } from "@/common/utils";
import rawLog from "@bksLogger";
import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient";

const log = rawLog.scope('ConnHandlers');

export interface IConnectionHandlers {
  // Connection management from the store **************************************
  'conn/create': ({ config, auth, osUser, sId }: {config: IConnection, auth?: { input: string; mode: "pin" }, osUser: string, sId: string }) => Promise<void>,
  'conn/test': ({ config, osUser, sId }: { config: IConnection, osUser: string, sId: string }) => Promise<string[]>,
  'conn/changeDatabase': ({ newDatabase, sId }: { newDatabase: string, sId: string }) => Promise<void>,
  'conn/clearConnection': ({ sId }: { sId: string}) => Promise<void>,
  'conn/getServerConfig': ({ sId }: { sId: string }) => Promise<IDbConnectionServerConfig>,

  // DB Metadata ****************************************************************
  'conn/supportedFeatures': ({ sId, database }: { sId: string, database?: string }) => Promise<SupportedFeatures>,
  'conn/versionString': ({ sId, database }: { sId: string, database?: string }) => Promise<string>,
  'conn/defaultSchema': ({ sId, database }: { sId: string, database?: string }) => Promise<string | null>,
  'conn/listCharsets': ({ sId, database }: { sId: string, database?: string }) => Promise<string[]>,
  'conn/getDefaultCharset': ({ sId, database }: { sId: string, database?: string }) => Promise<string>,
  'conn/listCollations': ({ charset, sId, database }: { charset: string, sId: string, database?: string }) => Promise<string[]>,


  // Connection *****************************************************************
  'conn/connect': ({ sId, database }: { sId: string, database?: string }) => Promise<void>,
  'conn/disconnect': ({ sId }: { sId: string}) => Promise<void>,


  // List schema information ****************************************************
  'conn/listTables': ({ filter, sId, database }: { filter?: FilterOptions, sId: string, database?: string }) => Promise<TableOrView[]>,
  'conn/listViews': ({ filter, sId, database }: { filter?: FilterOptions, sId: string, database?: string }) => Promise<TableOrView[]>,
  'conn/listRoutines': ({ filter, sId, database }: { filter?: FilterOptions, sId: string, database?: string }) => Promise<Routine[]>,
  'conn/listMaterializedViewColumns': ({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) => Promise<TableColumn[]>,
  'conn/listTableColumns': ({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) => Promise<ExtendedTableColumn[]>,
  'conn/listTableTriggers': ({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) => Promise<TableTrigger[]>,
  'conn/listTableIndexes': ({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) => Promise<TableIndex[]>,
  'conn/listSchemas': ({ filter, sId, database }: { filter?: SchemaFilterOptions, sId: string, database?: string }) => Promise<string[]>,
  'conn/getTableReferences': ({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) => Promise<string[]>,
  'conn/getTableKeys': ({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) => Promise<TableKey[]>,
  'conn/getOutgoingKeys': ({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) => Promise<TableKey[]>,
  'conn/getIncomingKeys': ({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) => Promise<TableKey[]>,
  'conn/listTablePartitions': ({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) => Promise<TablePartition[]>,
  'conn/executeCommand': ({ commandText, sId, database }: { commandText: string, sId: string, database?: string }) => Promise<NgQueryResult[]>,
  'conn/query': ({ queryText, options, tabId, hasActiveTransaction, sId, database }: { queryText: string, options?: any, tabId: number, hasActiveTransaction: boolean, sId: string, database?: string }) => Promise<string>,
  'conn/getResultEditData': ({ queryText, fields, sId, database }: { queryText: string, fields: FieldDescriptor[], sId: string, database?: string }) => Promise<FieldEditData[]>,
  'conn/getCompletions': ({ cmd, sId, database }: { cmd: string, sId: string, database?: string }) => Promise<string[]>,
  'conn/getShellPrompt': ({ sId, database }: { sId: string, database?: string }) => Promise<string>,
  'conn/executeQuery': ({ queryText, options, sId, database }: { queryText: string, options: any, sId: string, database?: string }) => Promise<NgQueryResult[]>,
  'conn/listDatabases': ({ filter, sId, database }: { filter?: DatabaseFilterOptions, sId: string, database?: string }) => Promise<string[]>,
  'conn/getTableProperties': ({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) => Promise<TableProperties | null>,
  'conn/getQuerySelectTop': ({ table, limit, schema, sId, database }: { table: string, limit: number, schema?: string, sId: string, database?: string }) => Promise<string>,
  'conn/listMaterializedViews': ({ filter, sId, database }: { filter?: FilterOptions, sId: string, database?: string }) => Promise<TableOrView[]>,
  'conn/getPrimaryKey': ({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) => Promise<string | null>,
  'conn/getPrimaryKeys': ({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) => Promise<PrimaryKeyColumn[]>,


  // Create Structure ***********************************************************
  'conn/createDatabase': ({ databaseName, charset, collation, sId, database }: { databaseName: string, charset: string, collation: string, sId: string, database?: string }) => Promise<string>,
  'conn/createDatabaseSQL': ({ sId, database }: { sId: string, database?: string }) => Promise<string>,
  'conn/getTableCreateScript': ({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) => Promise<string>,
  'conn/getViewCreateScript': ({ view, schema, sId, database }: { view: string, schema?: string, sId: string, database?: string }) => Promise<string[]>,
  'conn/getMaterializedViewCreateScript': ({ view, schema, sId, database }: { view: string, schema?: string, sId: string, database?: string }) => Promise<string[]>,
  'conn/getRoutineCreateScript': ({ routine, type, schema, id, sId, database }: { routine: string, type: string, schema?: string, id?: string, sId: string, database?: string }) => Promise<string[]>,
  'conn/createTable': ({ table, sId, database }: { table: CreateTableSpec, sId: string, database?: string }) => Promise<void>,
  'conn/getCollectionValidation': ({ collection, sId, database }: { collection: string, sId: string, database?: string }) => Promise<any>,
  'conn/setCollectionValidation': ({ params, sId, database }: { params: any, sId: string, database?: string }) => Promise<void>,


  // Make Changes ***************************************************************
  'conn/alterTableSql': ({ change, sId, database }: { change: AlterTableSpec, sId: string, database?: string }) => Promise<string>,
  'conn/alterTable': ({ change, sId, database }: { change: AlterTableSpec, sId: string, database?: string }) => Promise<void>,
  'conn/alterIndexSql': ({ changes, sId, database }: { changes: IndexAlterations, sId: string, database?: string }) => Promise<string | null>,
  'conn/alterIndex': ({ changes, sId, database }: { changes: IndexAlterations, sId: string, database?: string }) => Promise<void>,
  'conn/alterRelationSql': ({ changes, sId, database }: { changes: RelationAlterations, sId: string, database?: string }) => Promise<string | null>,
  'conn/alterRelation': ({ changes, sId, database }: { changes: RelationAlterations, sId: string, database?: string }) => Promise<void>,
  'conn/alterPartitionSql': ({ changes, sId, database }: { changes: AlterPartitionsSpec, sId: string, database?: string }) => Promise<string | null>,
  'conn/alterPartition': ({ changes, sId, database }: { changes: AlterPartitionsSpec, sId: string, database?: string }) => Promise<void>,
  'conn/applyChangesSql': ({ changes, sId, database }: { changes: TableChanges, sId: string, database?: string }) => Promise<string>,
  'conn/applyChanges': ({ changes, tabId, sId, database }: { changes: TableChanges, tabId?: number, sId: string, database?: string }) => Promise<TableUpdateResult[]>,
  'conn/setTableDescription': ({ table, description, schema, sId, database }: { table: string, description: string, schema?: string, sId: string, database?: string }) => Promise<string>,
  'conn/setElementName': ({ elementName, newElementName, typeOfElement, schema, sId, database }: { elementName: string, newElementName: string, typeOfElement: DatabaseElement, schema?: string, sId: string, database?: string }) => Promise<void>,
  'conn/dropElement': ({ elementName, typeOfElement, schema, sId, database }: { elementName: string, typeOfElement: DatabaseElement, schema?: string, sId: string, database?: string }) => Promise<void>,
  'conn/truncateElement': ({ elementName, typeOfElement, schema, sId, database }: { elementName: string, typeOfElement: DatabaseElement, schema?: string, sId: string, database?: string }) => Promise<void>,
  'conn/truncateAllTables': ({ schema, sId, database }: { schema?: string, sId: string, database?: string }) => Promise<void>,


  // For TableTable *************************************************************
  'conn/getTableLength': ({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) => Promise<number>,
  'conn/selectTop': ({ table, offset, limit, orderBy, filters, schema, selects, sId, database }: { table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[], sId: string, database?: string }) => Promise<TableResult>,
  'conn/selectTopSql': ({ table, offset, limit, orderBy, filters, schema, selects, sId, database }: { table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[], sId: string, database?: string }) => Promise<string>,
  'conn/selectTopStream': ({ table, orderBy, filters, chunkSize, schema, sId, database }: { table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string, sId: string, database?: string }) => Promise<StreamResults>,


  // For Export *****************************************************************
  'conn/queryStream': ({ query, chunkSize, sId, database }: { query: string, chunkSize: number, sId: string, database?: string }) => Promise<StreamResults>,


  // Duplicate Table ************************************************************
  'conn/duplicateTable': ({ tableName, duplicateTableName, schema, sId, database }: { tableName: string, duplicateTableName: string, schema?: string, sId: string, database?: string }) => Promise<void>,
  'conn/duplicateTableSql': ({ tableName, duplicateTableName, schema, sId, database }: { tableName: string, duplicateTableName: string, schema?: string, sId: string, database?: string }) => Promise<string>,


  'conn/getInsertQuery': ({ tableInsert, runAsUpsert, sId, database }: { tableInsert: TableInsert, runAsUpsert?: boolean, sId: string, database?: string }) => Promise<string>,

  'conn/syncDatabase': ({ sId, database }: { sId: string, database?: string }) => Promise<void>

  'conn/azureCancelAuth': ({ sId }: { sId: string }) => Promise<void>
  'conn/azureSignOut': ({ config, sId }: { config: IConnection, sId: string }) => Promise<void>,
  /** Get account name if it's signed in, otherwise return undefined */
  'conn/azureGetAccountName': ({ authId, sId }: { authId: number, sId: string }) => Promise<string | null>,

  'conn/getQueryForFilter': ({ filter, sId, database }: { filter: TableFilter, sId: string, database?: string }) => Promise<string>,
  'conn/getFilteredDataCount': ({ table, schema, filter, sId, database }: { table: string, schema: string | null, filter: string, sId: string, database?: string }) => Promise<string>

  'conn/reserveConnection': ({ tabId, sId, database }: { tabId: number, sId: string, database?: string }) => Promise<void>,
  'conn/releaseConnection': ({ tabId, sId, database }: { tabId: number, sId: string, database?: string }) => Promise<void>,
  'conn/startTransaction': ({ tabId, sId, database }: { tabId: number, sId: string, database?: string }) => Promise<void>,
  'conn/commitTransaction': ({ tabId, sId, database }: { tabId: number, sId: string, database?: string }) => Promise<void>,
  'conn/rollbackTransaction': ({ tabId, sId, database }: { tabId: number, sId: string, database?: string }) => Promise<void>,

  'conn/resetTransactionTimeout': ({ tabId, sId}: {tabId: number, sId: string}) => Promise<void>
}

export const ConnHandlers: IConnectionHandlers = {
  'conn/create': async function({ config, auth, osUser, sId }: { config: IConnection, auth?: { input: string; mode: "pin" }, osUser: string, sId: string}) {
    if (!osUser) {
      throw new Error(errorMessages.noUsername);
    }

    if (bksConfig.security.lockMode === "pin") {
      await waitPromise(1000);

      if (!auth) {
        throw new Error(`Authentication is required.`);
      }
      if (auth.mode !== "pin") {
        throw new Error(`Invalid authentication mode: ${auth.mode}`);
      }
      if(!await UserPin.verifyPin(auth.input)) {
        throw new Error(`Incorrect pin. Please try again.`);
      }
    }

    if (config.azureAuthOptions?.azureAuthEnabled && !config.authId) {
      let cache = new TokenCache();
      cache = await cache.save();
      config.authId = cache.id;
      // need to single out saved connections here (this may change when used connections are fixed)
      if (config.id) {
        // we do this so any temp configs that the user did aren't saved, just the id
        const conn = await SavedConnection.findOneBy({ id: config.id });
        conn.authId = cache.id;
        conn.save();
      }
    }

    const abortController = new AbortController();
    state(sId).connectionAbortController = abortController;

    let database = config.defaultDatabase || undefined;

    if (config.connectionType === 'surrealdb' && config?.surrealDbOptions?.namespace && database) {
      database = `${config?.surrealDbOptions?.namespace}::${database}`;
    }

    const settings = await UserSetting.all();
    const server = ConnectionProvider.for(config, osUser, settings);
    const connection = server.createConnection(database);
    try {
      await connection.connect(abortController.signal);
    } catch (e) {
      // A failed connect can still have opened sockets, pools or an ssh tunnel.
      // Nothing else holds a reference to `server` yet, so tear it down here or
      // it leaks for every failed attempt.
      try {
        server.disconnect();
      } catch (disconnectError) {
        log.error('Error cleaning up after a failed connection', disconnectError);
      }
      state(sId).connectionAbortController = null;
      throw e;
    }
    // HACK (@day): this is because of type fuckery, need to actually just recreate the object but I'm lazy rn and it's late
    connection.connectionType = config.connectionType ?? (config as any)._connectionType;
    await UsedConnection.recordUse(config);

    state(sId).server = server;
    state(sId).usedConfig = config;
    state(sId).connection = connection;
    state(sId).database = config.defaultDatabase;
    state(sId).generator = new SqlGenerator(dialectFor(config.connectionType), {
      dbConfig: connection.server.config,
      dbName: connection.database.database
    });
    state(sId).connectionAbortController = null
  },

  'conn/test': async function({ config, osUser, sId }: { config: IConnection, osUser: string, sId: string }) {
    // TODO (matthew): fix this mess.
    if (!osUser) {
      throw new Error(errorMessages.noUsername);
    }

    if (config.azureAuthOptions?.azureAuthEnabled && !config.authId) {
      let cache = new TokenCache();
      cache = await cache.save();
      config.authId = cache.id;
      // need to single out saved connections here (this may change when used connections are fixed)
      if (config.id) {
        // we do this so any temp configs that the user did aren't saved, just the id
        const conn = await SavedConnection.findOneBy({ id: config.id });
        conn.authId = cache.id;
        conn.save();
      }
    }

    let database = config.defaultDatabase || undefined;

    if (config.connectionType === 'surrealdb' && config?.surrealDbOptions?.namespace && database) {
      database = `${config.surrealDbOptions?.namespace}::${database}`;
    }

    const settings = await UserSetting.all();
    const server = ConnectionProvider.for(config, osUser, settings);
    const abortController = new AbortController();
    state(sId).connectionAbortController = abortController;
    await server?.createConnection(config.defaultDatabase || undefined).connect(abortController.signal);
    abortController.abort();
    const sshConfigWarnings = server.getServerConfig()?.sshConfigWarnings || [];
    server.disconnect();
    state(sId).connectionAbortController = null;
    return sshConfigWarnings;
  },

  'conn/changeDatabase': async function({ newDatabase, sId }: { newDatabase: string, sId: string }) {
    if (!state(sId).server) {
      throw new Error(errorMessages.noServer);
    }

    let connection: BasicDatabaseClient<any, any>;
    try {
      connection = await connectionFor(sId, newDatabase);
    } catch (e) {
      throw new Error(`Could not connect to database: ${e.message}`);
    }

    state(sId).connection = connection;
    state(sId).database = newDatabase;
  },

  'conn/clearConnection': async function({ sId }: { sId: string}) {
    const s = state(sId);
    if (!s) return;
    s.connection = null;
    s.server = null;
    s.usedConfig = null;
    s.database = null;
    s.generator = null;
  },
  'conn/getServerConfig': async function({ sId }: { sId: string }) {
    return state(sId).server.getServerConfig();
  },

  // can only be used when the function doesn't have any arguments :sad:
  'conn/supportedFeatures': getDriverHandler('supportedFeatures'),
  'conn/versionString': getDriverHandler('versionString'),
  'conn/defaultSchema': getDriverHandler('defaultSchema'),
  'conn/listCharsets': getDriverHandler('listCharsets'),
  'conn/getDefaultCharset': getDriverHandler('getDefaultCharset'),

  'conn/listCollations': async function({ charset, sId, database }: { charset: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.listCollations(charset);
  },

  'conn/connect': getDriverHandler('connect'),
  'conn/disconnect': async function({ sId }: { sId: string }) {
    const s = state(sId);
    if (!s?.connection) return;
    for (const tabId of [...s.transactionTimeouts.keys()]) {
      clearTransactionTimeout(sId, tabId);
    }
    // every database client of the server, then the shared ssh tunnel
    if (s.server) {
      s.server.end();
    } else {
      await s.connection.disconnect();
    }
  },

  'conn/listTables': async function({ filter, sId, database }: { filter?: FilterOptions, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.listTables(filter);
  },

  'conn/listViews': async function({ filter, sId, database }: { filter?: FilterOptions, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.listViews(filter);
  },

  'conn/listRoutines': async function({ filter, sId, database }: { filter?: FilterOptions, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.listRoutines(filter);
  },

  'conn/listMaterializedViewColumns': async function({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.listMaterializedViewColumns(table, schema);
  },

  'conn/listTableColumns': async function({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.listTableColumns(table, schema);
  },

  'conn/listTableTriggers': async function({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.listTableTriggers(table, schema);
  },

  'conn/listTableIndexes': async function({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.listTableIndexes(table, schema);
  },

  'conn/listSchemas': async function({ filter, sId, database }: { filter?: SchemaFilterOptions, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.listSchemas(filter);
  },

  'conn/getTableReferences': async function({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) {
      const connection = await connectionFor(sId, database);
     return await connection.getTableReferences(table, schema);
  },

  'conn/getTableKeys': async function({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.getTableKeys(table, schema);
  },

  'conn/getIncomingKeys': async function({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.getIncomingKeys(table, schema);
  },

  'conn/getOutgoingKeys': async function({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.getOutgoingKeys(table, schema);
  },

  'conn/listTablePartitions': async function({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.listTablePartitions(table, schema);
  },

  'conn/executeCommand': async function({ commandText, sId, database }: { commandText: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.executeCommand(commandText);
  },

  'conn/query': async function({ queryText, options, tabId, hasActiveTransaction, sId, database }: { queryText: string, options?: any, tabId: number, hasActiveTransaction: boolean, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    const query = await connection.query(queryText, tabId, options);
    const id = uuidv4();
    state(sId).queries.set(id, query);
    createOrResetTransactionTimeout(sId, tabId, connection, !hasActiveTransaction);
    return id;
  },

  'conn/getResultEditData': async function({ queryText, fields, sId, database }: { queryText: string, fields: FieldDescriptor[], sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.getResultEditData(queryText, fields);
  },

  'conn/getCompletions': async function({ cmd, sId, database }: { cmd: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.getCompletions(cmd);
  },

  'conn/getShellPrompt': async function({ sId, database }: { sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.getShellPrompt();
  },

  'conn/executeQuery': async function({ queryText, options, sId, database }: { queryText: string, options?: any, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.executeQuery(queryText, options);
  },

  'conn/listDatabases': async function({ filter, sId, database }: { filter?: DatabaseFilterOptions, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.listDatabases(filter);
  },

  'conn/getTableProperties': async function({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.getTableProperties(table, schema);
  },

  'conn/getQuerySelectTop': async function({ table, limit, schema, sId, database }: { table: string, limit: number, schema?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return connection.getQuerySelectTop(table, limit, schema);
  },

  'conn/listMaterializedViews': async function({ filter, sId, database }: { filter?: FilterOptions, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.listMaterializedViews(filter);
  },

  'conn/getPrimaryKey': async function({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.getPrimaryKey(table, schema);
  },

  'conn/getPrimaryKeys': async function({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.getPrimaryKeys(table, schema);
  },

  'conn/createDatabase': async function({ databaseName, charset, collation, sId, database }: { databaseName: string, charset: string, collation: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.createDatabase(databaseName, charset, collation);
  },

  'conn/createDatabaseSQL': async function({ sId, database }: { sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return connection.createDatabaseSQL();
  },

  'conn/getTableCreateScript': async function({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.getTableCreateScript(table, schema);
  },

  'conn/getViewCreateScript': async function({ view, schema, sId, database }: { view: string, schema?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.getViewCreateScript(view, schema);
  },

  'conn/getMaterializedViewCreateScript': async function({ view, schema, sId, database }: { view: string, schema?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.getMaterializedViewCreateScript(view, schema);
  },

  'conn/getRoutineCreateScript': async function({ routine, type, schema, id, sId, database }: { routine: string, type: string, schema?: string, id?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.getRoutineCreateScript(routine, type, schema, id);
  },

  'conn/createTable': async function({ table, sId, database }: { table: CreateTableSpec, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.createTable(table);
  },

  'conn/getCollectionValidation': async function({ collection, sId, database }: { collection: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.getCollectionValidation(collection);
  },

  'conn/setCollectionValidation': async function({ params, sId, database }: { params: any, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.setCollectionValidation(params);
  },

  'conn/alterTableSql': async function({ change, sId, database }: { change: AlterTableSpec, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.alterTableSql(change);
  },

  'conn/alterTable': async function({ change, sId, database }: { change: AlterTableSpec, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.alterTable(change);
  },

  'conn/alterIndexSql': async function({ changes, sId, database }: { changes: IndexAlterations, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return connection.alterIndexSql(changes);
  },

  'conn/alterIndex': async function({ changes, sId, database }: { changes: IndexAlterations, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.alterIndex(changes);
  },

  'conn/alterRelationSql': async function ({ changes, sId, database }: { changes: RelationAlterations, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return connection.alterRelationSql(changes);
  },

  'conn/alterRelation': async function({ changes, sId, database }: { changes: RelationAlterations, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.alterRelation(changes);
  },

  'conn/alterPartitionSql': async function({ changes, sId, database }: { changes: AlterPartitionsSpec, sId: string, database?: string }){
    const connection = await connectionFor(sId, database);
    return connection.alterPartitionSql(changes);
  },

  'conn/alterPartition': async function({ changes, sId, database }: { changes: AlterPartitionsSpec, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.alterPartition(changes);
  },

  'conn/applyChangesSql': async function({ changes, sId, database }: { changes: TableChanges, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return connection.applyChangesSql(changes);
  },

  'conn/applyChanges': async function({ changes, tabId, sId, database }: { changes: TableChanges, tabId?: number, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.applyChanges(changes, tabId);
  },

  'conn/setTableDescription': async function({ table, description, schema, sId, database }: { table: string, description: string, schema?: string, sId: string, database?: string }) {
     const connection = await connectionFor(sId, database);
     return await connection.setTableDescription(table, description, schema);
  },

  'conn/setElementName': async function({ elementName, newElementName, typeOfElement, schema, sId, database }: { elementName: string, newElementName: string, typeOfElement: DatabaseElement, schema?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.setElementName(elementName, newElementName, typeOfElement, schema);
  },

  'conn/dropElement': async function({ elementName, typeOfElement, schema, sId, database }: { elementName: string, typeOfElement: DatabaseElement, schema?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.dropElement(elementName, typeOfElement, schema);
  },

  'conn/truncateElement': async function({ elementName, typeOfElement, schema, sId, database }: {elementName: string, typeOfElement: DatabaseElement, schema?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.truncateElement(elementName, typeOfElement, schema);
  },

  'conn/truncateAllTables': async function({ schema, sId, database }: { schema?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return connection.truncateAllTables(schema);
  },

  'conn/getTableLength': async function({ table, schema, sId, database }: { table: string, schema?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.getTableLength(table, schema);
  },

  'conn/selectTop': async function({ table, offset, limit, orderBy, filters, schema, selects, sId, database }: { table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[], sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.selectTop(table, offset, limit, orderBy, filters, schema, selects);
  },

  'conn/selectTopSql': async function({ table, offset, limit, orderBy, filters, schema, selects, sId, database }: { table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[], sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.selectTopSql(table, offset, limit, orderBy, filters, schema, selects);
  },

  'conn/selectTopStream': async function({ table, orderBy, filters, chunkSize, schema, sId, database }: { table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.selectTopStream(table, orderBy, filters, chunkSize, schema);
  },

  'conn/queryStream': async function({ query, chunkSize, sId, database }: { query: string, chunkSize: number, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.queryStream(query, chunkSize);
  },

  'conn/duplicateTable': async function({ tableName, duplicateTableName, schema, sId, database }: { tableName: string, duplicateTableName: string, schema?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.duplicateTable(tableName, duplicateTableName, schema);
  },

  'conn/duplicateTableSql': async function({ tableName, duplicateTableName, schema, sId, database }: { tableName: string, duplicateTableName: string, schema?: string, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return connection.duplicateTableSql(tableName, duplicateTableName, schema);
  },

  'conn/getInsertQuery': async function({ tableInsert, runAsUpsert, sId, database }: { tableInsert: TableInsert, runAsUpsert?: boolean, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.getInsertQuery(tableInsert, runAsUpsert)
  },
  'conn/syncDatabase': getDriverHandler('syncDatabase'),

  'conn/azureCancelAuth': async function({ sId }: { sId: string }) {
    state(sId).connectionAbortController?.abort();
  },

  'conn/azureGetAccountName': async function({ authId }: { authId: number }) {
    if (!authId) {
      throw new Error("authId is required");
    }
    const cache = await TokenCache.findOneBy({id: authId})
    if (!cache) return null
    return cache.name
  },

  'conn/azureSignOut': async function({ config, sId }: { config: IConnection, sId: string }) {
    await AzureAuthService.ssoSignOut(config.authId)

    // Clean up authId cause it's invalid after signing out
    const savedConnection = await SavedConnection.findOneBy({id: config.id})
    savedConnection.authId = null
    await savedConnection.save()
    if (state(sId).usedConfig) {
      state(sId).usedConfig.authId = null
    }
  },

  'conn/getQueryForFilter': async function({ filter, sId, database }: { filter: TableFilter, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    return await connection.getQueryForFilter(filter);
  },

  'conn/getFilteredDataCount': async function({ table, schema = null, filter, sId, database }: { table: string, schema: string | null, filter: string, sId: string, database?: string }): Promise<string> {
    const connection = await connectionFor(sId, database);
    return await connection.getFilteredDataCount(table, schema, filter)
  },
  'conn/reserveConnection': async function({ tabId, sId, database }: { tabId: number, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    await connection.reserveConnection(tabId);
  },

  'conn/releaseConnection': async function({ tabId, sId, database }: { tabId: number, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    await connection.releaseConnection(tabId);
    clearTransactionTimeout(sId, tabId);
  },

  'conn/startTransaction': async function({ tabId, sId, database }: { tabId: number, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    await connection.startTransaction(tabId);
    createOrResetTransactionTimeout(sId, tabId, connection);
  },

  'conn/commitTransaction': async function({ tabId, sId, database }: { tabId: number, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    await connection.commitTransaction(tabId);
    clearTransactionTimeout(sId, tabId);
  },

  'conn/rollbackTransaction': async function({ tabId, sId, database }: { tabId: number, sId: string, database?: string }) {
    const connection = await connectionFor(sId, database);
    await connection.rollbackTransaction(tabId);
    clearTransactionTimeout(sId, tabId);
  },

  'conn/resetTransactionTimeout': async function({ tabId, sId }: { tabId: number, sId: string }) {
    const connection = state(sId).transactionClients.get(tabId);
    if (!connection) return;
    createOrResetTransactionTimeout(sId, tabId, connection, true);
  }
}

function clearTransactionTimeout(sId: string, tabId: number) {
  state(sId).transactionClients.delete(tabId);
  if (state(sId).transactionTimeouts.has(tabId)) {
    const timeout = state(sId).transactionTimeouts.get(tabId);
    state(sId).transactionTimeouts.delete(tabId);
    clearTimeout(timeout);
  }
}

/** `connection` is the client the transaction runs on, so the rollback hits that database */
function createOrResetTransactionTimeout(sId: string, tabId: number, connection: BasicDatabaseClient<any, any>, mustExist: boolean = false) {
  if (mustExist && !state(sId).transactionTimeouts.has(tabId)) {
    return;
  }

  clearTransactionTimeout(sId, tabId);
  state(sId).transactionClients.set(tabId, connection);

  let connectionType: string = connection.connectionType;
  connectionType = connectionType === 'postgresql' ? 'postgres' : connectionType;
  const timeout = setTimeout(() => {
    state(sId).port.postMessage({
      type: `transactionTimeoutWarning/${tabId}`
    });

    const warningWindowTimeout = setTimeout(async () => {
      await connection.rollbackTransaction(tabId);
      clearTransactionTimeout(sId, tabId);

      state(sId).port.postMessage({
        type: `transactionTimedOut/${tabId}`
      });

    }, bksConfig.db[connectionType].autoRollbackWarningWindow);

    state(sId).transactionTimeouts.set(tabId, warningWindowTimeout);

  }, bksConfig.db[connectionType].manualTransactionTimeout - bksConfig.db[connectionType].autoRollbackWarningWindow)
  state(sId).transactionTimeouts.set(tabId, timeout);
}
