import { DatabaseElement, IBasicDatabaseClient } from "../db/types";
import Vue from 'vue';
import { CancelableQuery, DatabaseFilterOptions, ExtendedTableColumn, FilterOptions, NgQueryResult, OrderBy, PrimaryKeyColumn, Routine, SchemaFilterOptions, SupportedFeatures, TableChanges, TableFilter, TableColumn, TableIndex, TableOrView, TablePartition, TableResult, TableProperties, StreamResults, TableInsert, TableTrigger, ImportFuncOptions, FieldDescriptor, FieldEditData, ServerStatistics } from "../db/models";
import { AlterPartitionsSpec, AlterTableSpec, CreateTableSpec, IndexAlterations, RelationAlterations, TableKey } from "@shared/lib/dialects/models";
import { IConnection } from "@/common/interfaces/IConnection";


export class ElectronUtilityConnectionClient implements IBasicDatabaseClient {
  /**
   * @param database a database of the current server other than the active
   * one. Every `conn/*` call is then routed to that database's client.
   */
  constructor(readonly database: string | null = null) {}

  /** A client bound to `database` (the server key, `ns::db` for SurrealDB). */
  forDatabase(database: string | null): ElectronUtilityConnectionClient {
    return new ElectronUtilityConnectionClient(database);
  }

  protected async send(handlerName: string, args: any = {}): Promise<any> {
    if (this.database == null) return await Vue.prototype.$util.send(handlerName, args);
    return await Vue.prototype.$util.send(handlerName, { ...args, database: this.database });
  }

  async supportedFeatures(): Promise<SupportedFeatures> {
    return await this.send('conn/supportedFeatures', {})
  }

  async versionString(): Promise<string> {
    return await this.send('conn/versionString', {});
  }

  async defaultSchema(): Promise<string> {
    return await this.send('conn/defaultSchema', {});
  }

  async listCharsets(): Promise<string[]> {
    return await this.send('conn/listCharsets', {});
  }

  async getDefaultCharset(): Promise<string> {
    return await this.send('conn/getDefaultCharset', {});
  }

  async listCollations(charset: string): Promise<string[]> {
    return await this.send('conn/listCollations', { charset });
  }

  async connect(): Promise<void> {
    return await this.send('conn/connect', {});
  }

  async disconnect(): Promise<void> {
    return await this.send('conn/disconnect', {});
  }

  async listTables(filter?: FilterOptions): Promise<TableOrView[]> {
    return await this.send('conn/listTables', { filter });
  }

  async listViews(filter?: FilterOptions): Promise<TableOrView[]> {
    return await this.send('conn/listViews', { filter });
  }

  async listRoutines(filter?: FilterOptions): Promise<Routine[]> {
    return await this.send('conn/listRoutines', { filter });
  }

  async listMaterializedViewColumns(table: string, schema?: string): Promise<TableColumn[]> {
    return await this.send('conn/listMaterializedViewColumns', { table, schema })
  }

  async listTableColumns(table: string, schema?: string): Promise<ExtendedTableColumn[]> {
    return await this.send('conn/listTableColumns', { table, schema });
  }

  async listTableTriggers(table: string, schema?: string): Promise<TableTrigger[]> {
    return await this.send('conn/listTableTriggers', { table, schema });
  }

  async listTableIndexes(table: string, schema?: string): Promise<TableIndex[]> {
    return await this.send('conn/listTableIndexes', { table, schema });
  }

  async listSchemas(filter?: SchemaFilterOptions): Promise<string[]> {
    return await this.send('conn/listSchemas', { filter });
  }

  async getTableReferences(table: string, schema?: string): Promise<string[]> {
    return await this.send('conn/getTableReferences', { table, schema });
  }

  async getTableKeys(table: string, schema?: string): Promise<TableKey[]> {
    return await this.send('conn/getTableKeys', { table, schema });
  }

  async listTablePartitions(table: string, schema?: string): Promise<TablePartition[]> {
    return await this.send('conn/listTablePartitions', { table, schema });
  }

  async executeCommand(commandText: string): Promise<NgQueryResult[]> {
    return await this.send('conn/executeCommand', { commandText });
  }

  async query(queryText: string, tabId: number, options?: any, hasActiveTransaction: boolean = false): Promise<CancelableQuery> {
    const id = await this.send('conn/query', { queryText, options, tabId, hasActiveTransaction });
    return {
      execute: async () => {
        return await Vue.prototype.$util.send('query/execute', { queryId: id })
      },
      cancel: async () => {
        return await Vue.prototype.$util.send('query/cancel', { queryId: id })
      }
    }
  }

  async getResultEditData(queryText: string, fields: FieldDescriptor[]): Promise<FieldEditData[]> {
    return await this.send('conn/getResultEditData', { queryText, fields });
  }

  async getCompletions(cmd: string): Promise<string[]> {
    return await this.send('conn/getCompletions', { cmd });
  }

  async getShellPrompt(): Promise<string> {
    return await this.send('conn/getShellPrompt');
  }

  async executeQuery(queryText: string, options?: any): Promise<NgQueryResult[]> {
    return await this.send('conn/executeQuery', { queryText, options });
  }

  async listDatabases(filter?: DatabaseFilterOptions): Promise<string[]> {
    return await this.send('conn/listDatabases', { filter });
  }

  async getTableProperties(table: string, schema?: string): Promise<TableProperties> {
    return await this.send('conn/getTableProperties', { table, schema });
  }

  async getQuerySelectTop(table: string, limit: number, schema?: string): Promise<string> {
    return await this.send('conn/getQuerySelectTop', { table, limit, schema });
  }

  async listMaterializedViews(filter?: FilterOptions): Promise<TableOrView[]> {
    return await this.send('conn/listMaterializedViews', { filter });
  }

  async getPrimaryKey(table: string, schema?: string): Promise<string> {
    return await this.send('conn/getPrimaryKey', { table, schema });
  }

  async getPrimaryKeys(table: string, schema?: string): Promise<PrimaryKeyColumn[]> {
    return await this.send('conn/getPrimaryKeys', { table, schema });
  }

  async createDatabase(databaseName: string, charset: string, collation: string): Promise<string> {
    return await this.send('conn/createDatabase', { databaseName, charset, collation });
  }

  async createDatabaseSQL(): Promise<string> {
    return await this.send('conn/createDatabaseSQL', {});
  }

  async getTableCreateScript(table: string, schema?: string): Promise<string> {
    return await this.send('conn/getTableCreateScript', { table, schema });
  }

  async getViewCreateScript(view: string, schema?: string): Promise<string[]> {
    return await this.send('conn/getViewCreateScript', { view, schema });
  }

  async getMaterializedViewCreateScript(view: string, schema?: string): Promise<string[]> {
    return await this.send('conn/getMaterializedViewCreateScript', { view, schema });
  }

  async getRoutineCreateScript(routine: string, type: string, schema?: string, id?: string): Promise<string[]> {
    return await this.send('conn/getRoutineCreateScript', { routine, type, schema, id });
  }

  async createTable(table: CreateTableSpec): Promise<void> {
    return await this.send('conn/createTable', { table });
  }

  async getCollectionValidation(collection: string): Promise<any> {
    return await this.send('conn/getCollectionValidation', { collection });
  }

  async setCollectionValidation(params: any): Promise<void> {
    return await this.send('conn/setCollectionValidation', { params });
  }

  async alterTableSql(change: AlterTableSpec): Promise<string> {
    return await this.send('conn/alterTableSql', { change });
  }

  async alterTable(change: AlterTableSpec): Promise<void> {
    return await this.send('conn/alterTable', { change });
  }

  async alterIndexSql(changes: IndexAlterations): Promise<string> {
    return await this.send('conn/alterIndexSql', { changes });
  }

  async alterIndex(changes: IndexAlterations): Promise<void> {
    return await this.send('conn/alterIndex', { changes });
  }

  async alterRelationSql(changes: RelationAlterations): Promise<string> {
    return await this.send('conn/alterRelationSql', { changes });
  }

  async alterRelation(changes: RelationAlterations): Promise<void> {
    return await this.send('conn/alterRelation', { changes });
  }

  async alterPartitionSql(changes: AlterPartitionsSpec): Promise<string> {
    return await this.send('conn/alterPartitionSql', { changes });
  }

  async alterPartition(changes: AlterPartitionsSpec): Promise<void> {
    return await this.send('conn/alterPartition', { changes });
  }

  async applyChangesSql(changes: TableChanges): Promise<string> {
    return await this.send('conn/applyChangesSql', { changes });
  }

  async applyChanges(changes: TableChanges, tabId?: number): Promise<any[]> {
    return await this.send('conn/applyChanges', { changes, tabId });
  }

  async setTableDescription(table: string, description: string, schema?: string): Promise<string> {
    return await this.send('conn/setTableDescription', { table, description, schema });
  }

  async setElementName(elementName: string, newElementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void> {
    return await this.send('conn/setElementName', { elementName, newElementName, typeOfElement, schema });
  }

  async dropElement(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void> {
    return await this.send('conn/dropElement', { elementName, typeOfElement, schema });
  }

  async truncateElement(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void> {
    return await this.send('conn/truncateElement', { elementName, typeOfElement, schema });
  }

  async truncateAllTables(schema?: string): Promise<void> {
    return await this.send('conn/truncateAllTables', { schema });
  }

  async getTableLength(table: string, schema?: string): Promise<number> {
    return await this.send('conn/getTableLength', { table, schema });
  }

  async selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<TableResult> {
    return await this.send('conn/selectTop', { table, offset, limit, orderBy, filters, schema, selects });
  }

  async selectTopSql(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<string> {
    return await this.send('conn/selectTopSql', { table, offset, limit, orderBy, filters, schema, selects });
  }

  async selectTopStream(table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string): Promise<StreamResults> {
    return await this.send('conn/selectTopStream', { table, orderBy, filters, chunkSize, schema });
  }

  async queryStream(query: string, chunkSize: number): Promise<StreamResults> {
    return await this.send('conn/queryStream', { query, chunkSize });
  }

  async duplicateTable(tableName: string, duplicateTableName: string, schema?: string): Promise<void> {
    return await this.send('conn/duplicateTable', { tableName, duplicateTableName, schema });
  }

  async duplicateTableSql(tableName: string, duplicateTableName: string, schema?: string): Promise<string> {
    return await this.send('conn/duplicateTableSql', { tableName, duplicateTableName, schema });
  }

  async getInsertQuery(tableInsert: TableInsert): Promise<string> {
    return await this.send('conn/getInsertQuery', { tableInsert });
  }

  async syncDatabase(): Promise<void> {
    return await this.send('conn/syncDatabase');
  }

  async azureCancelAuth(): Promise<void> {
    return await this.send('conn/azureCancelAuth');
  }

  async azureGetAccountName(authId: string): Promise<string | null> {
    return await this.send('conn/azureGetAccountName', { authId });
  }

  async azureSignOut(config: IConnection): Promise<void> {
    return await this.send('conn/azureSignOut', { config });
  }

  async importStepZero(_table: TableOrView): Promise<any> {
    throw new Error ('Do not use on front end')
  }

  async importBeginCommand(_table: TableOrView, _importOptions?: ImportFuncOptions): Promise<any> {
    throw new Error ('Do not use on front end')
  }

  async importTruncateCommand(_table: TableOrView, _importOptions?: ImportFuncOptions): Promise<any> {
    throw new Error ('Do not use on front end')
  }

  async importLineReadCommand(_table: TableOrView, _sqlString: string | string[], _importOptions?: ImportFuncOptions): Promise<any> {
    throw new Error ('Do not use on front end')
  }

  async importCommitCommand(_table: TableOrView, _importOptions?: ImportFuncOptions): Promise<any> {
    throw new Error ('Do not use on front end')
  }

  async importRollbackCommand(_table: TableOrView, _importOptions?: ImportFuncOptions): Promise<any> {
    throw new Error ('Do not use on front end')
  }

  async importFinalCommand(_table: TableOrView, _importOptions?: ImportFuncOptions): Promise<any> {
    throw new Error ('Do not use on front end')
  }

  /** Returns a query for the given filter */
  async getQueryForFilter(filter: TableFilter): Promise<string> {
    return await this.send('conn/getQueryForFilter', { filter });
  }

  async getFilteredDataCount(table: string, schema: string | null, filter: string): Promise<string> {
    return await this.send('conn/getFilteredDataCount', { table, schema, filter });
  }

  async reserveConnection(tabId: number) {
    return await this.send('conn/reserveConnection', { tabId });
  }

  async releaseConnection(tabId: number) {
    return await this.send('conn/releaseConnection', { tabId });
  }

  async startTransaction(tabId: number) {
    return await this.send('conn/startTransaction', { tabId });
  }

  async commitTransaction(tabId: number) {
    return await this.send('conn/commitTransaction', { tabId });
  }

  async rollbackTransaction(tabId: number) {
    return await this.send('conn/rollbackTransaction', { tabId });
  }
  // no frontend for this yet
  getServerStatistics(): Promise<ServerStatistics | null> {
      throw new Error("Method not implemented.");
  }
}
