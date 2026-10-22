import { describe, it, expect, vi, beforeAll } from "vitest";
import { createLocalVue, mount, shallowMount } from "@vue/test-utils";
import Vuex from "vuex";
import Vue from "vue";
import { AppEventMixin } from "@/common/AppEvent";
import appStore from "@/store";
import { ConnectionTreeModule } from "@/store/modules/ConnectionTreeModule";
import TableList from "@/components/sidebar/core/TableList.vue";
import VirtualTableList from "@/components/sidebar/core/table_list/VirtualTableList.vue";

// TableList splits its panes with split.js, which needs a real layout
vi.mock("split.js", () => ({ default: () => ({ destroy: vi.fn(), setSizes: vi.fn() }) }));

const root = (appStore as any)._modules.root._rawModule;

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.mixin(AppEventMixin);
localVue.config.ignoredElements = [/^x-/];
localVue.directive("tooltip", {});

const WINDOW = { id: 3, name: "app", workspaceId: -1 };
const C = { id: 7, name: "beta", workspaceId: -1 };
const D = { id: 9, name: "Alpha", workspaceId: -1 };

function makeStore(save: ReturnType<typeof vi.fn>) {
  return new Vuex.Store({
    state: {
      tables: [], routines: [], database: "a", databaseList: [], databaseEntities: {}, inaccessibleDatabases: [],
      tablesLoading: null, supportedFeatures: {}, connectionType: "postgresql", selectedSidebarItem: null,
      usedConfig: WINDOW, workspaceId: -1, activeTab: null,
      entityFilter: { filterQuery: undefined, showTables: true, showViews: true, showRoutines: true, showPartitions: false },
      "data/connections": { items: [] },
    },
    getters: {
      filteredTables: root.getters.filteredTables, filteredRoutines: root.getters.filteredRoutines,
      schemaTables: root.getters.schemaTables, schemas: root.getters.schemas,
      dialectData: () => ({ disabledFeatures: {} }), dialect: () => "postgresql", defaultSchema: () => "public",
      minimalMode: () => false, selectedSidebarItem: () => null, cloudClient: () => null,
      "pins/pinnedEntities": () => [], "pins/orderedPins": () => [],
      "hideEntities/totalEntities": () => 0, "hideEntities/databaseEntities": () => [], "hideEntities/databaseSchemas": () => [],
    },
    actions: { loadDatabaseEntities: vi.fn(), updateDatabaseTableColumns: vi.fn() },
    modules: {
      connectionTree: ConnectionTreeModule,
      settings: {
        namespaced: true,
        state: { scope: "pinned" },
        getters: { settings: (state: any) => ({ connectionTreeScope: { value: state.scope } }) },
        mutations: { scope: (state: any, value: string) => (state.scope = value) },
        // what the settings module does: store the value, the getter follows
        actions: {
          save: (context: any, payload: any) => {
            save(payload);
            context.commit("scope", payload.value);
          },
        },
      },
      pinnedConnections: { namespaced: true, state: { pins: [{ connectionId: 7, position: 0 }] } },
      pins: { namespaced: true, state: { pins: [] } },
      hideEntities: { namespaced: true, state: { entities: [], schemas: [] } },
      databaseLabels: { namespaced: true, state: { labels: [] }, getters: { colorFor: () => () => null } },
    },
  });
}

beforeAll(() => {
  (globalThis as any).ResizeObserver = class { observe() {} disconnect() {} };
  (window as any).platformInfo = { ...(window as any).platformInfo, isDevelopment: false };
});

describe("connection scope menu", () => {
  it("scope menu saves each value and rebuilds the tree", async () => {
    Vue.prototype.$util = { send: vi.fn(async (name: string) => (name === "appdb/saved/find" ? [WINDOW, C, D] : null)), sId: "w1" };
    const save = vi.fn();
    const store = makeStore(save);
    const mocks = {
      $bksConfig: { ui: { tableList: { itemHeight: 20, revealActiveEntity: true } }, security: {} },
      $bks: { openMenu: vi.fn() },
    };
    const menu = shallowMount(TableList, { localVue, store, stubs: { portal: { template: "<div><slot /></div>" } }, mocks });
    const tree = mount(VirtualTableList, { localVue, store, mocks });
    await Vue.nextTick();
    await new Promise((r) => setTimeout(r, 0));
    const level = () => (tree.vm as any).items.filter((i: any) => i.type === "connection").map((i: any) => i.entity);
    expect(level()).toEqual(["app", "beta"]);

    const expected: Record<string, string[]> = { off: [], all: ["app", "Alpha", "beta"], pinned: ["app", "beta"] };
    for (const value of ["off", "all", "pinned"]) {
      const radio = menu.find(`input[name="connection-tree-scope"][value="${value}"]`);
      await radio.setChecked();
      await Vue.nextTick();
      await Vue.nextTick();

      expect(save).toHaveBeenLastCalledWith({ key: "connectionTreeScope", value });
      expect(level()).toEqual(expected[value]);
    }
    expect(save).toHaveBeenCalledTimes(3);
    menu.destroy();
    tree.destroy();
  });
});
