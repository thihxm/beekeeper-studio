import { describe, it, expect, vi } from "vitest";
import { createLocalVue, mount } from "@vue/test-utils";
import Vuex from "vuex";
import TabWithTable from "@/components/common/TabWithTable.vue";

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.config.ignoredElements = [/^x-/];

describe("TabWithTable", () => {
  it("missing table in its database shows the not-found state", () => {
    const entities = { b: { status: "loaded", tables: [{ name: "events", schema: "public" }], routines: [] } };
    const store = new Vuex.Store({
      state: {
        database: "a",
        tablesInitialLoaded: true,
        tables: [{ name: "orders", schema: "public" }],
        databaseEntities: entities,
      },
      getters: {
        tablesFor: (state: any) => (db: string) => (db == null || db === state.database ? state.tables : state.databaseEntities[db]?.tables ?? []),
      },
      actions: { loadDatabaseEntities: vi.fn() },
    });
    // orders exists in the default database, not in b
    const wrapper = mount(TabWithTable, {
      localVue,
      store,
      propsData: { tab: { tabType: "table", tableName: "orders", schemaName: "public", databaseName: "b" } },
      scopedSlots: { default: '<div class="table-slot">{{ props.table.name }}</div>' },
    });

    expect(wrapper.text()).toContain("This table does not exist in the selected database");
    expect(wrapper.find(".table-slot").exists()).toBe(false);
  });
});
