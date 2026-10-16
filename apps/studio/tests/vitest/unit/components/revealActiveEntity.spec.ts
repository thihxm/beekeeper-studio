import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { createLocalVue, mount, Wrapper } from "@vue/test-utils";
import Vuex from "vuex";
import Vue from "vue";
import { AppEventMixin, AppEvent } from "@/common/AppEvent";
import { sidebarKeyForTab } from "@/common/sidebarKey";
import CoreTabHeader from "@/components/CoreTabHeader.vue";
import VirtualTableList from "@/components/sidebar/core/table_list/VirtualTableList.vue";

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.mixin(AppEventMixin);
localVue.directive("tooltip", {});
localVue.config.ignoredElements = [/^x-/];

const usersA = { name: "users", schema: "public", entityType: "table", columns: [] };
const usersB = { name: "users", schema: "public", entityType: "table", columns: [] };
const salesB = { name: "sales", schema: "reporting", entityType: "table", columns: [] };

let wrapper: Wrapper<Vue>;

beforeAll(() => {
  (globalThis as any).ResizeObserver = class { observe() {} disconnect() {} };
});
afterEach(() => wrapper?.destroy());

function mountTree(revealActiveEntity: boolean) {
  const loadDatabaseEntities = vi.fn();
  const store = new Vuex.Store({
    state: {
      database: "a",
      databaseList: ["a", "b"],
      databaseEntities: {},
      inaccessibleDatabases: [],
      entityFilter: { filterQuery: undefined, showTables: true, showViews: true, showRoutines: true, showPartitions: false },
      usedConfig: { readOnlyMode: false, username: "u" },
      activeTab: null,
    },
    getters: {
      defaultSchema: () => "public",
      minimalMode: () => false,
      dialect: () => "postgresql",
      dialectData: () => ({ disabledFeatures: {} }),
      selectedSidebarItem: () => null,
      schemaTables: () => [{ schema: "public", tables: [usersA], routines: [] }],
    },
    actions: { loadDatabaseEntities, updateDatabaseTableColumns: vi.fn() },
    modules: {
      pins: { namespaced: true, state: { pins: [] } },
      hideEntities: { namespaced: true, state: { entities: [], schemas: [] } },
      databaseLabels: { namespaced: true, getters: { colorFor: () => () => null } },
    },
  });
  wrapper = mount(VirtualTableList, {
    localVue,
    store,
    mocks: {
      $bksConfig: { ui: { tableList: { itemHeight: 20, revealActiveEntity } } },
      $bks: { openMenu: vi.fn() },
    },
  });
  const vm = wrapper.vm as any;
  const scrollToIndex = vi.fn();
  vm.$refs.vList.scrollToIndex = scrollToIndex;
  return { store, vm, loadDatabaseEntities, scrollToIndex };
}

const flush = async () => { await Vue.nextTick(); await Vue.nextTick(); await Vue.nextTick(); };

describe("selection key of the active tab", () => {
  it("selection key includes the tab database", () => {
    const tab = { id: 9, tabType: "table", tableName: "users", schemaName: "public", entityType: "table", databaseName: "b" };
    expect(sidebarKeyForTab(tab, "a")).toBe("b::table.public.users");
    expect(sidebarKeyForTab({ ...tab, databaseName: "a" }, "a")).toBe("table.public.users");

    // the active tab's header commits the key and asks the tree to reveal it
    const ctx = {
      tab,
      activeTab: tab,
      $store: { state: { database: "a" }, commit: vi.fn() },
      trigger: vi.fn(),
    };
    ((CoreTabHeader as any).options ?? CoreTabHeader).watch.activeTab.call(ctx);
    expect(ctx.$store.commit).toHaveBeenCalledWith("selectSidebarItem", "b::table.public.users");
    expect(ctx.trigger).toHaveBeenCalledWith(AppEvent.revealSidebarItem, "b::table.public.users");
  });

  it("selection key uses the entity type", () => {
    const tab = { tabType: "table", tableName: "v", schemaName: "public", entityType: "view", databaseName: null };
    expect(sidebarKeyForTab(tab, "a")).toBe("view.public.v");
  });
});

describe("revealing the active tab's table", () => {
  it("reveals the selected table in its database", async () => {
    const { store, vm, loadDatabaseEntities, scrollToIndex } = mountTree(true);
    const b = () => vm.items.find((i: any) => i.key === "database::b");
    expect(b().expanded).toBe(false);

    vm.revealItem("b::table.public.users");
    expect(b().expanded).toBe(true);
    expect(loadDatabaseEntities).toHaveBeenCalledTimes(1);
    expect(loadDatabaseEntities.mock.calls[0][1]).toEqual({ database: "b", force: false });

    // b finishes loading: two schemas, so public is a folder that has to open
    store.state.databaseEntities = { b: { status: "loaded", tables: [usersB, salesB], routines: [] } };
    await flush();

    const target = vm.items.find((i: any) => i.key === "b::table.public.users");
    expect(target.parent.type).toBe("schema");
    expect(target.parent.expanded).toBe(true);
    const index = vm.displayItems.indexOf(target);
    expect(index).toBeGreaterThan(-1);
    expect(scrollToIndex).toHaveBeenCalledWith(index);
  });

  it("reveal can be turned off", async () => {
    const { vm, loadDatabaseEntities, scrollToIndex } = mountTree(false);
    const before = vm.items.map((i: any) => [i.key, i.expanded]);

    vm.revealItem("b::table.public.users");
    vm.$root.$emit(AppEvent.revealSidebarItem, "table.public.users");
    await flush();

    expect(vm.items.map((i: any) => [i.key, i.expanded])).toEqual(before);
    expect(scrollToIndex).toHaveBeenCalledTimes(0);
    expect(loadDatabaseEntities).toHaveBeenCalledTimes(0);
  });
});
