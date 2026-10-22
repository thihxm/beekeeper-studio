import { describe, it, expect, vi } from "vitest";
import TableTable from "@/components/tableview/TableTable.vue";
import TabTableProperties from "@/components/TabTableProperties.vue";
import TableSchema from "@/components/tableinfo/TableSchema.vue";
import TableRelations from "@/components/tableinfo/TableRelations.vue";
import { FkLinkMixin } from "@/mixins/fk_click";
import { AppEvent } from "@/common/AppEvent";

// Regression for the manual test of 2026-10-15: a tab bound to another database
// loaded its table's columns from the default one, so the tab never opened.
const methods = (component: any) => (component.options ?? component).methods;
const computed = (component: any) => (component.options ?? component).computed;

const ordersB = { name: "orders", schema: "public", entityType: "table", columns: [] };

describe("tabs bound to another database load their columns from it", () => {
  it("TableTable refresh loads columns from the tab's database", async () => {
    const ctx = {
      tab: { tabType: "table", databaseName: "b" },
      table: ordersB,
      tabulator: {
        getPage: () => 1,
        replaceData: vi.fn(async () => undefined),
        getColumnLayout: () => [],
        setColumns: vi.fn(async () => undefined),
        setColumnLayout: vi.fn(),
        setPage: vi.fn(),
      },
      tableColumns: [],
      active: true,
      forceRedraw: false,
      getTableKeys: vi.fn(async () => undefined),
      $store: { dispatch: vi.fn(async () => undefined) },
    };

    await methods(TableTable).refreshTable.call(ctx);

    expect(ctx.$store.dispatch).toHaveBeenCalledWith("updateDatabaseTableColumns", { database: "b", table: ordersB, targetConnectionId: null });
    expect(ctx.$store.dispatch).not.toHaveBeenCalledWith("updateTableColumns", expect.anything());
  });

  it("table structure tab loads columns from the tab's database", async () => {
    const ctx = {
      tab: { tabType: "table-properties", databaseName: "b" },
      table: ordersB,
      connection: { getPrimaryKeys: vi.fn(async () => []), getTableProperties: vi.fn(async () => null) },
      $store: { dispatch: vi.fn(async () => undefined) },
    };

    await methods(TabTableProperties).refresh.call(ctx);

    expect(ctx.$store.dispatch).toHaveBeenCalledWith("updateDatabaseTableColumns", { database: "b", table: ordersB, targetConnectionId: null });
  });

  it("following a foreign key opens the target in the tab's database", async () => {
    const customersB = { name: "customers", schema: "public", entityType: "table" };
    const tablesFor = vi.fn((db: string) => (db === "b" ? [customersB] : []));
    const ctx = {
      tab: { tabType: "table", databaseName: "b" },
      $store: { getters: { tablesFor } },
      $root: { $emit: vi.fn() },
      $noty: { error: vi.fn() },
      trigger: vi.fn(),
    };
    const cell: any = {
      getField: () => "customer_id",
      getValue: () => 7,
      getColumn: () => ({ getDefinition: () => ({ formatterParams: {} }) }),
      getRow: () => ({ getCell: () => ({}) }),
    };

    await FkLinkMixin.methods.fkClick.call(ctx, { toTable: "customers", toSchema: "public", toColumn: "id", fromColumn: "customer_id" }, cell);

    // the window's connection: no target connection
    expect(tablesFor).toHaveBeenCalledWith("b", null);
    expect(ctx.$root.$emit).toHaveBeenCalledWith(AppEvent.loadTable, expect.objectContaining({ table: customersB, database: "b" }));
    expect(ctx.$noty.error).not.toHaveBeenCalled();
  });

  it("opening a table tab loads columns from the tab's database", async () => {
    const ctx = {
      tab: { tabType: "table", databaseName: "b" },
      table: ordersB,
      initialized: false,
      resetPendingChanges: vi.fn(),
      getTableKeys: vi.fn(async () => undefined),
      loadPersistence: vi.fn(async () => undefined),
      $refs: {},
      $store: { dispatch: vi.fn(async () => undefined) },
    };

    // the rest of initialize builds tabulator, which this context doesn't provide
    await methods(TableTable).initialize.call(ctx).catch(() => undefined);

    expect(ctx.$store.dispatch).toHaveBeenCalledWith("updateDatabaseTableColumns", { database: "b", table: ordersB, targetConnectionId: null });
    expect(ctx.$store.dispatch).not.toHaveBeenCalledWith("updateTableColumns", expect.anything());
  });

  it("a changed result shape reloads columns from the tab's database", async () => {
    const ctx: any = {
      tab: { tabType: "table", databaseName: "b" },
      table: { ...ordersB, columns: [] },
      dialectData: { usesOffsetPagination: true },
      limit: 100,
      filters: null,
      page: 1,
      paginationStates: [null],
      primaryKeys: [],
      tableColumns: [],
      tableHolder: { scrollLeft: 0 },
      tabulator: { getColumns: () => [] },
      // the query returned a column the cached table doesn't know about
      connection: { selectTop: vi.fn(async () => ({ result: [], fields: ["id"] })) },
      resetPendingChanges: vi.fn(),
      clearQueryError: vi.fn(),
      dataToTableData: () => [],
      $nextTick: (fn: () => void) => fn?.(),
      $store: { dispatch: vi.fn(async () => undefined) },
    };

    await methods(TableTable).dataFetch.call(ctx, null, null, { page: 1, size: 100 });

    expect(ctx.$store.dispatch).toHaveBeenCalledWith("updateDatabaseTableColumns", { database: "b", table: ctx.table, targetConnectionId: null });
  });

  it("applying a structure change reloads columns from the tab's database", async () => {
    const ctx = {
      table: ordersB,
      usedConfig: { readOnlyMode: false },
      error: null,
      tabDatabase: () => "b",
      tabConnectionId: () => null,
      collectChanges: () => ({ table: "orders" }),
      clearChanges: vi.fn(),
      initializeTabulator: vi.fn(),
      connection: { alterTable: vi.fn(async () => undefined) },
      $nextTick: (fn: () => void) => fn(),
      $noty: { success: vi.fn(), error: vi.fn() },
      $store: { dispatch: vi.fn(async () => undefined) },
    };

    await methods(TableSchema).submitApply.call(ctx);

    expect(ctx.$store.dispatch).toHaveBeenCalledWith("updateDatabaseTableColumns", { database: "b", table: ordersB, targetConnectionId: null });
  });

  it("the foreign key picker loads target columns from the tab's database", async () => {
    const customers: any = { name: "customers", schema: "public", entityType: "table", columns: null };
    const ctx = {
      tabDatabase: () => "b",
      tabConnectionId: () => null,
      findTable: vi.fn(() => customers),
      $store: {
        dispatch: vi.fn(async () => { customers.columns = [{ columnName: "id" }]; }),
      },
    };
    const cell: any = { getRow: () => ({ getData: () => ({ toSchema: "public", toTable: "customers" }) }) };

    const columns = await methods(TableRelations).getColumns.call(ctx, cell);

    expect(ctx.$store.dispatch).toHaveBeenCalledWith("updateDatabaseTableColumns", { database: "b", table: customers, targetConnectionId: null });
    expect(columns).toEqual(["id"]);
  });

  it("the foreign key picker lists schemas and tables of the tab's database", () => {
    const tablesB = [
      { name: "orders", schema: "sales", entityType: "table" },
      { name: "customers", schema: "crm", entityType: "table" },
    ];
    const tablesFor = vi.fn((db: string) => (db === "b" ? tablesB : [{ name: "users", schema: "public" }]));
    // the default database's getters, which the picker must not use
    const $store = { getters: { tablesFor, schemas: ["public"], schemaTables: [{ schema: "public", tables: [] }] } };
    const ctx: any = { tabDatabase: () => "b", tabConnectionId: () => null, $store };
    ctx.tables = computed(TableRelations).tables.call(ctx);

    expect(tablesFor).toHaveBeenCalledWith("b", null);
    expect(computed(TableRelations).schemas.call(ctx)).toEqual(["sales", "crm"]);
    expect(computed(TableRelations).schemaTables.call(ctx).map((st) => st.schema)).toEqual(["sales", "crm"]);
  });
});

// Live validation: table tabs on a saved connection opened from the tree loaded
// their columns on the window's connection, so they showed no data or an error.
describe("tabs on a saved connection load their columns from it", () => {
  it("TableTable refresh loads columns from the tab connection", async () => {
    const ctx = {
      tab: { tabType: "table", databaseName: "inventory", targetConnectionId: 7 },
      table: ordersB,
      tabulator: {
        getPage: () => 1,
        replaceData: vi.fn(async () => undefined),
        getColumnLayout: () => [],
        setColumns: vi.fn(async () => undefined),
        setColumnLayout: vi.fn(),
        setPage: vi.fn(),
      },
      tableColumns: [],
      active: true,
      forceRedraw: false,
      getTableKeys: vi.fn(async () => undefined),
      $store: { dispatch: vi.fn(async () => undefined) },
    };

    await methods(TableTable).refreshTable.call(ctx);

    expect(ctx.$store.dispatch).toHaveBeenCalledWith("updateDatabaseTableColumns", { database: "inventory", table: ordersB, targetConnectionId: 7 });
  });

  it("opening a table tab loads columns from the tab connection", async () => {
    const ctx = {
      tab: { tabType: "table", databaseName: "inventory", targetConnectionId: 7 },
      table: ordersB,
      initialized: false,
      resetPendingChanges: vi.fn(),
      getTableKeys: vi.fn(async () => undefined),
      loadPersistence: vi.fn(async () => undefined),
      $refs: {},
      $store: { dispatch: vi.fn(async () => undefined) },
    };

    await methods(TableTable).initialize.call(ctx).catch(() => undefined);

    expect(ctx.$store.dispatch).toHaveBeenCalledWith("updateDatabaseTableColumns", { database: "inventory", table: ordersB, targetConnectionId: 7 });
  });

  it("a changed result shape reloads columns from the tab connection", async () => {
    const ctx: any = {
      tab: { tabType: "table", databaseName: "inventory", targetConnectionId: 7 },
      table: { ...ordersB, columns: [] },
      dialectData: { usesOffsetPagination: true },
      limit: 100,
      filters: null,
      page: 1,
      paginationStates: [null],
      primaryKeys: [],
      tableColumns: [],
      tableHolder: { scrollLeft: 0 },
      tabulator: { getColumns: () => [] },
      connection: { selectTop: vi.fn(async () => ({ result: [], fields: ["id"] })) },
      resetPendingChanges: vi.fn(),
      clearQueryError: vi.fn(),
      dataToTableData: () => [],
      $nextTick: (fn: () => void) => fn?.(),
      $store: { dispatch: vi.fn(async () => undefined) },
    };

    await methods(TableTable).dataFetch.call(ctx, null, null, { page: 1, size: 100 });

    expect(ctx.$store.dispatch).toHaveBeenCalledWith("updateDatabaseTableColumns", { database: "inventory", table: ctx.table, targetConnectionId: 7 });
  });

  it("table structure tab loads columns from the tab connection", async () => {
    const ctx = {
      tab: { tabType: "table-properties", databaseName: "inventory", targetConnectionId: 7 },
      table: ordersB,
      connection: { getPrimaryKeys: vi.fn(async () => []), getTableProperties: vi.fn(async () => null) },
      $store: { dispatch: vi.fn(async () => undefined) },
    };

    await methods(TabTableProperties).refresh.call(ctx);

    expect(ctx.$store.dispatch).toHaveBeenCalledWith("updateDatabaseTableColumns", { database: "inventory", table: ordersB, targetConnectionId: 7 });
  });

  it("applying a structure change reloads columns from the tab connection", async () => {
    const ctx = {
      table: ordersB,
      usedConfig: { readOnlyMode: false },
      error: null,
      tabDatabase: () => "inventory",
      tabConnectionId: () => 7,
      collectChanges: () => ({ table: "orders" }),
      clearChanges: vi.fn(),
      initializeTabulator: vi.fn(),
      connection: { alterTable: vi.fn(async () => undefined) },
      $nextTick: (fn: () => void) => fn(),
      $noty: { success: vi.fn(), error: vi.fn() },
      $store: { dispatch: vi.fn(async () => undefined) },
    };

    await methods(TableSchema).submitApply.call(ctx);

    expect(ctx.$store.dispatch).toHaveBeenCalledWith("updateDatabaseTableColumns", { database: "inventory", table: ordersB, targetConnectionId: 7 });
  });

  it("the foreign key picker loads target columns from the tab connection", async () => {
    const customers: any = { name: "customers", schema: "public", entityType: "table", columns: null };
    const ctx = {
      tabDatabase: () => "inventory",
      tabConnectionId: () => 7,
      findTable: vi.fn(() => customers),
      $store: {
        dispatch: vi.fn(async () => { customers.columns = [{ columnName: "id" }]; }),
      },
    };
    const cell: any = { getRow: () => ({ getData: () => ({ toSchema: "public", toTable: "customers" }) }) };

    await methods(TableRelations).getColumns.call(ctx, cell);

    expect(ctx.$store.dispatch).toHaveBeenCalledWith("updateDatabaseTableColumns", { database: "inventory", table: customers, targetConnectionId: 7 });
  });
});
