import { describe, it, expect, vi, afterEach } from "vitest";
import Vue from "vue";
import { getDialectData } from "@shared/lib/dialects";
import appStore from "@/store";
import { AppEvent } from "@/common/AppEvent";
import { ElectronUtilityConnectionClient } from "@/lib/utility/ElectronUtilityConnectionClient";
import { buildCopyText } from "@/lib/menu/tableMenu";
import { FkLinkMixin } from "@/mixins/fk_click";
import TabQueryEditor from "@/components/TabQueryEditor.vue";
import TableTable from "@/components/tableview/TableTable.vue";
import TabTableProperties from "@/components/TabTableProperties.vue";
import TabWithTable from "@/components/common/TabWithTable.vue";
import ResultTable from "@/components/editor/ResultTable.vue";
import QueryEditorStatusBar from "@/components/editor/QueryEditorStatusBar.vue";
import QueryEditHistory from "@/components/editor/QueryEditHistory.vue";
import QueryDatabaseSelector from "@/components/editor/QueryDatabaseSelector.vue";
import StatusBar from "@/components/common/StatusBar.vue";
import RowFilterBuilder from "@/components/tableview/RowFilterBuilder.vue";
import BuilderFilter from "@/components/tableview/filter/BuilderFilter.vue";
import TableSchema from "@/components/tableinfo/TableSchema.vue";
import TableIndexes from "@/components/tableinfo/TableIndexes.vue";
import TableRelations from "@/components/tableinfo/TableRelations.vue";
import TableTriggers from "@/components/tableinfo/TableTriggers.vue";
import TablePartitions from "@/components/tableinfo/TablePartitions.vue";

// The window is Postgres; saved connection 7, opened from the tree, is MySQL.
const usersPg = { name: "users", schema: "public", entityType: "table" };
const usersMy = { name: "users", schema: null, entityType: "table" };
const windowContext = {
  connectionId: null,
  config: { id: 3, name: "app", connectionType: "postgresql", readOnlyMode: false, labelColor: "red" },
  connectionType: "postgresql",
  dialect: "postgresql",
  dialectData: getDialectData("postgresql"),
  supportedFeatures: { properties: true, partitions: true, editPartitions: true, filterTypes: ["pg"] },
  defaultSchema: "public",
  database: "a",
  databaseList: ["a", "b"],
  missing: false,
};
const mysqlContext = {
  connectionId: 7,
  config: { id: 7, name: "shop-mysql", connectionType: "mysql", readOnlyMode: true, labelColor: "blue" },
  connectionType: "mysql",
  dialect: "mysql",
  dialectData: getDialectData("mysql"),
  supportedFeatures: { properties: false, partitions: false, editPartitions: false, filterTypes: ["my"] },
  defaultSchema: null,
  database: "shop",
  databaseList: ["audit", "shop"],
  missing: false,
};

const windowClient = new ElectronUtilityConnectionClient();

/** A store whose window-level getters all answer for the Postgres window */
function fakeStore(activeTab: any = null) {
  return {
    state: {
      usedConfig: windowContext.config,
      connectionType: "postgresql",
      supportedFeatures: windowContext.supportedFeatures,
      defaultSchema: "public",
      database: "a",
      databaseList: ["a", "b"],
      tablesInitialLoaded: true,
      databaseEntities: {},
      inaccessibleDatabases: [],
      tables: [usersPg],
      tabs: { active: activeTab },
    },
    getters: {
      dialect: "postgresql",
      dialectData: getDialectData("postgresql"),
      connectionColor: "red",
      activeConnectionColor: activeTab?.targetConnectionId === 7 ? "blue" : "red",
      connectionContext: (id: number | null) => (id === 7 ? mysqlContext : windowContext),
      connectionFor: (database: string | null, id: number | null) =>
        id === 7 ? windowClient.forConnection({ sId: "w1::connection::7" }).forDatabase(database) : windowClient,
      tablesFor: (_database: string | null, id: number | null) => (id === 7 ? [usersMy] : [usersPg]),
      "connectionTree/connection": () => ({ status: "connected", database: "shop", databaseEntities: { shop: { status: "loaded" } }, inaccessibleDatabases: [] }),
    },
    dispatch: vi.fn(async () => true),
    commit: vi.fn(),
  };
}

const tab = { id: 21, tabType: "query", targetConnectionId: 7, databaseName: "shop" };

/**
 * Evaluates computed `names` of `component` as Vue would inside a tab bound to
 * connection 7: the injected `tabConnectionId` / `tabDatabase`, or `this.tab`
 * for the tab components themselves.
 */
function computedUnder(component: any, names: string[], extra: Record<string, any> = {}) {
  const computed = Vue.extend(component).options.computed;
  const ctx: any = {
    $store: fakeStore(tab),
    tab,
    tabConnectionId: () => 7,
    tabDatabase: () => "shop",
    ...extra,
  };
  // what each read depends on, in dependency order
  for (const name of ["connectionContext", "targetConnectionId", "connectionColor", "database", "connection", "tables", ...names]) {
    if (!computed[name] || name in extra) continue;
    const get = typeof computed[name] === "function" ? computed[name] : computed[name].get;
    Object.defineProperty(ctx, name, { value: get.call(ctx), configurable: true, writable: true });
  }
  return ctx;
}

const expectedRead: Record<string, (ctx: any) => void> = {
  dialect: (ctx) => expect(ctx.dialect).toBe("mysql"),
  dialectData: (ctx) => expect(ctx.dialectData).toBe(mysqlContext.dialectData),
  connectionType: (ctx) => expect(ctx.connectionType).toBe("mysql"),
  supportedFeatures: (ctx) => expect(ctx.supportedFeatures).toBe(mysqlContext.supportedFeatures),
  defaultSchema: (ctx) => expect(ctx.defaultSchema).toBeNull(),
  usedConfig: (ctx) => expect(ctx.usedConfig).toBe(mysqlContext.config),
  tables: (ctx) => expect(ctx.tables).toEqual([usersMy]),
  options: (ctx) => expect(ctx.options).toEqual(["audit", "shop"]),
  classes: (ctx) => expect(ctx.classes).toMatchObject({ blue: true }),
};

const FILES: [string, any, string[]][] = [
  ["TabQueryEditor", TabQueryEditor, ["dialect", "dialectData", "connectionType", "defaultSchema", "usedConfig", "tables"]],
  ["TableTable", TableTable, ["dialect", "dialectData", "connectionType", "usedConfig"]],
  ["TabTableProperties", TabTableProperties, ["dialect", "dialectData", "supportedFeatures"]],
  ["TabWithTable", TabWithTable, ["tables"]],
  ["ResultTable", ResultTable, ["dialect", "dialectData", "connectionType", "defaultSchema", "usedConfig"]],
  ["QueryEditorStatusBar", QueryEditorStatusBar, ["dialect", "dialectData", "usedConfig"]],
  ["QueryEditHistory", QueryEditHistory, ["connectionType", "dialectData"]],
  ["QueryDatabaseSelector", QueryDatabaseSelector, ["options"]],
  ["StatusBar", StatusBar, ["classes"]],
  ["RowFilterBuilder", RowFilterBuilder, ["dialectData"]],
  ["BuilderFilter", BuilderFilter, ["supportedFeatures"]],
  ["TableSchema", TableSchema, ["dialect", "dialectData", "usedConfig"]],
  ["TableIndexes", TableIndexes, ["connectionType", "dialect", "dialectData", "usedConfig"]],
  ["TableRelations", TableRelations, ["tables", "dialect", "dialectData", "usedConfig"]],
  ["TableTriggers", TableTriggers, ["connectionType", "dialectData"]],
  ["TablePartitions", TablePartitions, ["supportedFeatures", "dialect"]],
];

afterEach(() => vi.restoreAllMocks());

describe("tab components on a saved connection opened from the tree", () => {
  it("tab components read the secondary connection", async () => {
    for (const [name, component, reads] of FILES) {
      const ctx = computedUnder(component, reads, name === "StatusBar" ? { mode: null } : {});
      for (const read of reads) {
        try {
          expectedRead[read](ctx);
        } catch (e) {
          throw new Error(`${name}.${read}: ${e.message}`);
        }
      }
    }

    // fk_click: the target of a foreign key is looked up, and opened, on the same connection
    const tablesFor = vi.fn(() => [usersMy]);
    const fkCtx: any = {
      tab: { tabType: "table", databaseName: "shop", targetConnectionId: 7 },
      $store: { getters: { tablesFor } },
      $root: { $emit: vi.fn() },
      $noty: { error: vi.fn() },
      trigger: vi.fn(),
    };
    const cell: any = {
      getField: () => "user_id",
      getValue: () => 3,
      getColumn: () => ({ getDefinition: () => ({ formatterParams: {} }) }),
      getRow: () => ({ getCell: () => ({}) }),
    };
    await FkLinkMixin.methods.fkClick.call(fkCtx, { toTable: "users", toSchema: null, toColumn: "id", fromColumn: "user_id" }, cell);
    expect(tablesFor).toHaveBeenCalledWith("shop", 7);
    expect(fkCtx.$root.$emit).toHaveBeenCalledWith(AppEvent.loadTable, expect.objectContaining({ table: usersMy, database: "shop", connectionId: 7 }));
  });

  it("direct sends follow the tab connection", async () => {
    const send = vi.fn(async (name: string) => (name === "conn/listTableColumns" ? [{ columnName: "id", dataType: "int" }] : "insert ..."));
    Vue.prototype.$util = { send, sId: "w1" };
    const { connection } = computedUnder(TableTable, []);

    await buildCopyText([{ id: 1 }] as any, { type: "asIn", table: "users", connection });
    await buildCopyText([{ id: 1 }] as any, { type: "sql", table: "users", connection });
    await connection.resetTransactionTimeout(21);

    expect(send.mock.calls.map(([name, args]) => [name, args.sId])).toEqual([
      ["conn/listTableColumns", "w1::connection::7"],
      ["conn/getInsertQuery", "w1::connection::7"],
      ["conn/resetTransactionTimeout", "w1::connection::7"],
    ]);
  });

  it("read only follows the tab connection", () => {
    for (const component of [TableTable, QueryEditorStatusBar, TableSchema, TableIndexes, TableRelations]) {
      expect(computedUnder(component, ["usedConfig"]).usedConfig.readOnlyMode).toBe(true);
    }
    // and the other way around: a read-write saved connection in a read-only window
    const readOnlyWindow = { ...windowContext.config, readOnlyMode: true };
    const readWrite = { ...mysqlContext, config: { ...mysqlContext.config, readOnlyMode: false } };
    for (const component of [TableTable, QueryEditorStatusBar, TableSchema, TableIndexes, TableRelations]) {
      const store = fakeStore(tab);
      store.state.usedConfig = readOnlyWindow;
      store.getters.connectionContext = (id: number | null) => (id === 7 ? readWrite : { ...windowContext, config: readOnlyWindow });
      expect(computedUnder(component, ["usedConfig"], { $store: store }).usedConfig.readOnlyMode).toBe(false);
    }
  });

  it("tabs without a target connection are unchanged", () => {
    const getters = (appStore as any)._modules.root._rawModule.getters;
    const state = { connection: windowClient, database: "a", usedConfig: windowContext.config, connectionType: "postgresql", supportedFeatures: {}, defaultSchema: "public", databaseList: ["a"] };
    const g: any = { dialect: "postgresql", dialectData: getDialectData("postgresql"), databaseKey: (d: string) => d };
    const connectionFor = getters.connectionFor(state, g);
    const connectionContext = getters.connectionContext(state, g);

    expect(connectionFor(null, null)).toBe(windowClient);
    expect(connectionFor("a", null)).toBe(windowClient);
    expect(connectionFor("b", null).database).toBe("b");
    expect(connectionFor("b", null).session).toBeNull();
    expect(connectionContext(null).dialect).toBe("postgresql");
    expect(connectionContext(null).config).toBe(windowContext.config);
  });
});
