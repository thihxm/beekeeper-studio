import { describe, it, expect, vi } from "vitest";
import QuickSearch from "@/components/quicksearch/QuickSearch.vue";
import { AppEvent } from "@/common/AppEvent";

const methods = ((QuickSearch as any).options ?? QuickSearch).methods;

function context() {
  return {
    $root: { $emit: vi.fn() },
    $store: { dispatch: vi.fn() },
    closeSearch: vi.fn(),
  };
}

describe("QuickSearch", () => {
  it("table result opens bound to its database", async () => {
    const ctx = context();
    const table = { name: "orders", schema: "public", entityType: "table" };
    await methods.submit.call(ctx, { type: "table", item: table, database: "b", title: "b · public.orders" });

    expect(ctx.$root.$emit).toHaveBeenCalledWith(AppEvent.loadTable, { table, database: "b" });
  });

  it("database result expands instead of switching", async () => {
    const ctx = context();
    await methods.submit.call(ctx, { type: "database", item: "b", title: "database: b" });

    expect(ctx.$root.$emit).toHaveBeenCalledWith(AppEvent.expandDatabase, "b");
    const actions = ctx.$store.dispatch.mock.calls.map(([action]) => action);
    expect(actions.filter((a) => a === "changeDatabase")).toHaveLength(0);
  });
});
