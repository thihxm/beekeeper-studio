import { describe, it, expect, vi } from "vitest";
import TableTable from "@/components/tableview/TableTable.vue";
import TabTableProperties from "@/components/TabTableProperties.vue";
import { FkLinkMixin } from "@/mixins/fk_click";
import { AppEvent } from "@/common/AppEvent";

// Regression for the manual test of 2026-10-15: a tab bound to another database
// loaded its table's columns from the default one, so the tab never opened.
const methods = (component: any) => (component.options ?? component).methods;

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

    expect(ctx.$store.dispatch).toHaveBeenCalledWith("updateDatabaseTableColumns", { database: "b", table: ordersB });
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

    expect(ctx.$store.dispatch).toHaveBeenCalledWith("updateDatabaseTableColumns", { database: "b", table: ordersB });
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

    expect(tablesFor).toHaveBeenCalledWith("b");
    expect(ctx.$root.$emit).toHaveBeenCalledWith(AppEvent.loadTable, expect.objectContaining({ table: customersB, database: "b" }));
    expect(ctx.$noty.error).not.toHaveBeenCalled();
  });
});
