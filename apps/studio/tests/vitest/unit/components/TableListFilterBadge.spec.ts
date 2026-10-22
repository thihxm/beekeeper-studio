import { describe, it, expect, vi } from "vitest";
import { createLocalVue, shallowMount } from "@vue/test-utils";
import Vuex from "vuex";
import { AppEventMixin } from "@/common/AppEvent";
import appStore from "@/store";
import TableList from "@/components/sidebar/core/TableList.vue";

// TableList splits its panes with split.js, which needs a real layout
vi.mock("split.js", () => ({ default: () => ({ destroy: vi.fn(), setSizes: vi.fn() }) }));

const root = (appStore as any)._modules.root._rawModule;

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.mixin(AppEventMixin);

const table = (name: string, schema = "public") => ({ name, schema, entityType: "table", columns: [] });

function mountTableList(hidden: any[]) {
  const log = table("log", "audit");
  const store = new Vuex.Store({
    state: {
      tables: [table("users"), table("orders"), log],
      routines: [],
      database: "a",
      databaseEntities: {
        b: { status: "loaded", tables: [table("users"), table("events")], routines: [] },
        c: { status: "loading", tables: [], routines: [] },
      },
      tablesLoading: null,
      supportedFeatures: {},
      connectionType: "postgresql",
      selectedSidebarItem: null,
      usedConfig: { readOnlyMode: false },
      entityFilter: { filterQuery: "use", showTables: true, showViews: true, showRoutines: true, showPartitions: false },
    },
    getters: {
      filteredTables: root.getters.filteredTables,
      filteredRoutines: root.getters.filteredRoutines,
      dialectData: () => ({ disabledFeatures: {} }),
      dialect: () => "postgresql",
      "pins/pinnedEntities": () => [],
      "pins/orderedPins": () => [],
      "hideEntities/totalEntities": () => hidden.length,
      "hideEntities/databaseEntities": () => hidden.map((name) => (name === "log" ? log : name)),
      "hideEntities/databaseSchemas": () => [],
    },
  });
  (window as any).platformInfo = { ...(window as any).platformInfo, isDevelopment: false };
  return shallowMount(TableList, {
    localVue,
    store,
    stubs: { portal: { template: "<div><slot /></div>" } },
    mocks: { $bksConfig: { ui: { tableList: { itemHeight: 20 } } } },
  });
}

const badge = (wrapper: any) => wrapper.find(".list-heading .badge").text().replace(/\s+/g, " ");

describe("TableList entities badge while filtering", () => {
  it("badge sums the default and loaded databases", () => {
    expect(badge(mountTableList([]))).toBe("2 / 5");
    expect(badge(mountTableList(["log"]))).toBe("2 / 4");
  });
});
