import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { createLocalVue, mount, Wrapper } from "@vue/test-utils";
import Vuex from "vuex";
import Vue from "vue";
import { AppEventMixin } from "@/common/AppEvent";
import appStore from "@/store";
import VirtualTableList from "@/components/sidebar/core/table_list/VirtualTableList.vue";

// the app's own filter getters and mutations, so the tree is filtered exactly like the app's
const root = (appStore as any)._modules.root._rawModule;

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.mixin(AppEventMixin);
localVue.config.ignoredElements = [/^x-/];
localVue.directive("tooltip", {});

const table = (name: string, schema = "public") => ({ name, schema, entityType: "table", columns: [] });

// `users` lives in both databases; `user_log` sits in a second schema of the default one
const defaultTables = () => [table("users"), table("orders"), table("user_log", "audit")];

interface Options {
  multipleDatabasesDisabled?: boolean;
  databaseList?: string[];
  databaseEntities?: Record<string, any>;
  inaccessibleDatabases?: string[];
  hiddenEntities?: any[];
  hiddenSchemas?: any[];
}

let wrapper: Wrapper<Vue>;

function mountList(opts: Options = {}) {
  const store = new Vuex.Store({
    state: {
      database: "a",
      databaseList: opts.databaseList ?? ["a", "b", "c"],
      databaseEntities: opts.databaseEntities ?? {},
      inaccessibleDatabases: opts.inaccessibleDatabases ?? [],
      tables: defaultTables(),
      routines: [],
      entityFilter: { filterQuery: undefined, showTables: true, showViews: true, showRoutines: true, showPartitions: false },
      usedConfig: { readOnlyMode: false, username: "app_user" },
      activeTab: null,
    },
    getters: {
      defaultSchema: () => "public",
      minimalMode: () => false,
      dialect: () => "postgresql",
      dialectData: () => ({ disabledFeatures: opts.multipleDatabasesDisabled ? { multipleDatabases: true } : {} }),
      selectedSidebarItem: () => null,
      filteredTables: root.getters.filteredTables,
      filteredRoutines: root.getters.filteredRoutines,
      schemaTables: root.getters.schemaTables,
      schemas: root.getters.schemas,
    },
    mutations: {
      databaseEntities: root.mutations.databaseEntities,
      filterQuery: root.mutations.filterQuery,
    },
    actions: {
      loadDatabaseEntities: vi.fn(),
      updateDatabaseTableColumns: vi.fn(),
    },
    modules: {
      pins: { namespaced: true, state: { pins: [] } },
      hideEntities: { namespaced: true, state: { entities: opts.hiddenEntities ?? [], schemas: opts.hiddenSchemas ?? [] } },
      databaseLabels: {
        namespaced: true,
        state: { labels: [] },
        getters: { colorFor: () => () => null },
      },
    },
  });
  wrapper = mount(VirtualTableList, {
    localVue,
    store,
    mocks: {
      $bksConfig: { ui: { tableList: { itemHeight: 20, revealActiveEntity: true } } },
      $bks: { openMenu: vi.fn() },
    },
  });
  return { store, vm: wrapper.vm as any };
}

async function settle() {
  await Vue.nextTick();
  await Vue.nextTick();
}

async function setFilter(store: any, query: string | null) {
  store.commit("filterQuery", query);
  await settle();
}

const loaded = (...tables: any[]) => ({ status: "loaded", tables, routines: [] });

/** displayed tables as `<database>:<name>`, the default database as `a` */
const shownTables = (vm: any) =>
  vm.displayItems.filter((i: any) => i.type === "table").map((i: any) => `${i.database ?? "a"}:${i.entity.name}`);
const shownDatabases = (vm: any) =>
  vm.displayItems.filter((i: any) => i.type === "database").map((i: any) => i.entity);
const databaseItem = (vm: any, name: string) => vm.items.find((i: any) => i.key === `database::${name}`);

beforeAll(() => {
  (globalThis as any).ResizeObserver = class { observe() {} disconnect() {} };
});

afterEach(() => wrapper?.destroy());

describe("VirtualTableList filter across loaded databases", () => {
  it("shows matches under collapsed database and schema nodes", async () => {
    const { store, vm } = mountList({
      databaseEntities: { b: loaded(table("users"), table("events"), table("sales", "reporting")) },
    });
    await settle();
    // b is loaded but was never expanded; audit is not the default schema
    expect(databaseItem(vm, "b").expanded).toBe(false);

    await setFilter(store, "use");

    const shown = shownTables(vm);
    expect(shown).toContain("a:users");
    expect(shown).toContain("a:user_log");
    expect(shown).toContain("b:users");
    expect(shown).not.toContain("a:orders");
    expect(shown).not.toContain("b:events");
  });

  it("hides loaded databases without a match", async () => {
    const { store, vm } = mountList({
      databaseEntities: { b: loaded(table("users")), c: loaded(table("invoices")) },
    });
    await settle();
    expect(shownDatabases(vm)).toEqual(["a", "b", "c"]);

    await setFilter(store, "use");

    expect(shownDatabases(vm)).toContain("b");
    expect(shownDatabases(vm)).not.toContain("c");
  });

  it.each([
    ["idle", {}, []],
    ["loading", { d: { status: "loading", tables: [], routines: [] } }, []],
    ["error", { d: { status: "error", tables: [], routines: [], error: "boom" } }, []],
    ["locked", {}, ["d"]],
  ])("keeps unloaded database nodes collapsed (%s)", async (_state, databaseEntities, inaccessibleDatabases) => {
    const { store, vm } = mountList({
      databaseList: ["a", "d"],
      databaseEntities,
      inaccessibleDatabases,
    });
    await settle();

    await setFilter(store, "use");

    const d = databaseItem(vm, "d");
    expect(vm.displayItems).toContain(d);
    expect(d.expanded).toBe(false);
    expect(vm.displayItems.filter((i: any) => i.parent === d)).toEqual([]);
  });

  it("shows matches of a database that loads during the filter", async () => {
    const { store, vm } = mountList();
    await settle();
    await setFilter(store, "eve");
    expect(shownTables(vm)).not.toContain("b:events");

    store.commit("databaseEntities", { database: "b", entities: loaded(table("users"), table("events")) });
    await settle();

    expect(shownTables(vm)).toContain("b:events");
    expect(databaseItem(vm, "b").expanded).toBe(false);
  });

  it("restores the user's expansion when the filter is cleared", async () => {
    const { store, vm } = mountList({ databaseEntities: { b: loaded(table("users"), table("events")) } });
    await settle();

    await setFilter(store, "use");
    expect(shownTables(vm)).toContain("b:users");
    await setFilter(store, null);

    expect(databaseItem(vm, "b").expanded).toBe(false);
    expect(shownTables(vm)).not.toContain("b:users");

    // a click during the filter is what the tree keeps afterwards
    await setFilter(store, "use");
    vm.handleExpand(null, databaseItem(vm, "b"));
    await settle();
    await setFilter(store, null);

    expect(databaseItem(vm, "b").expanded).toBe(true);
    expect(shownTables(vm)).toContain("b:users");
  });

  it("single-database dialects filter as before", async () => {
    const { store, vm } = mountList({
      multipleDatabasesDisabled: true,
      databaseEntities: { b: loaded(table("users")) },
    });
    await settle();

    await setFilter(store, "use");

    expect(shownDatabases(vm)).toEqual([]);
    expect(shownTables(vm)).toContain("a:users");
    expect(shownTables(vm)).not.toContain("a:orders");
    expect(shownTables(vm).filter((t: string) => t.startsWith("b:"))).toEqual([]);
  });

  it("keeps the default database when it has no match", async () => {
    const { store, vm } = mountList({ databaseEntities: { b: loaded(table("users")) } });
    await settle();

    await setFilter(store, "zzz");

    expect(shownDatabases(vm)).toContain("a");
    expect(shownDatabases(vm)).not.toContain("b");
  });

  it("hidden entities and hidden schemas do not count as matches", async () => {
    // both matches of `s` in b are hidden: `events` itself, and `user_stats` through its schema
    const { store, vm } = mountList({
      databaseEntities: { b: loaded(table("events"), table("user_stats", "reporting")) },
      hiddenEntities: [{ databaseName: "b", schemaName: "public", entityName: "events", entityType: "table" }],
      hiddenSchemas: [{ databaseName: "b", name: "reporting" }],
    });
    await settle();

    await setFilter(store, "s");

    expect(shownDatabases(vm)).not.toContain("b");
    expect(shownTables(vm).filter((t: string) => t.startsWith("b:"))).toEqual([]);
  });

  it("keeps a locked database collapsed even when its entities were loaded", async () => {
    const { store, vm } = mountList({
      databaseEntities: { b: loaded(table("users"), table("events")) },
      inaccessibleDatabases: ["b"],
    });
    await settle();

    await setFilter(store, "use");

    const b = databaseItem(vm, "b");
    expect(vm.displayItems).toContain(b);
    expect(b.expanded).toBe(false);
    expect(shownTables(vm).filter((t: string) => t.startsWith("b:"))).toEqual([]);
  });
});
