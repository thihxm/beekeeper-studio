import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { createLocalVue, mount, Wrapper } from "@vue/test-utils";
import Vuex from "vuex";
import Vue from "vue";
import { AppEventMixin } from "@/common/AppEvent";
import VirtualTableList from "@/components/sidebar/core/table_list/VirtualTableList.vue";

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.mixin(AppEventMixin);
localVue.config.ignoredElements = [/^x-/];

const usersA = { name: "users", schema: "public", entityType: "table", columns: [] };
const ordersA = { name: "orders", schema: "public", entityType: "table", columns: [] };
const logA = { name: "log", schema: "audit", entityType: "table", columns: [] };
const usersB = { name: "users", schema: "public", entityType: "table", columns: [] };
const eventsB = { name: "events", schema: "public", entityType: "table", columns: [] };
const salesB = { name: "sales", schema: "reporting", entityType: "table", columns: [] };

interface Options {
  multipleDatabasesDisabled?: boolean;
  databaseList?: string[];
  databaseEntities?: Record<string, any>;
  pins?: any[];
  hiddenEntities?: any[];
}

function makeStore(opts: Options = {}) {
  const loadDatabaseEntities = vi.fn();
  const store = new Vuex.Store({
    state: {
      database: "a",
      databaseList: opts.databaseList ?? ["a", "b", "c"],
      databaseEntities: opts.databaseEntities ?? {},
      entityFilter: { filterQuery: undefined, showTables: true, showViews: true, showRoutines: true, showPartitions: false },
      usedConfig: { readOnlyMode: false },
      activeTab: null,
    },
    getters: {
      defaultSchema: () => "public",
      minimalMode: () => false,
      dialect: () => "postgresql",
      dialectData: () => ({ disabledFeatures: opts.multipleDatabasesDisabled ? { multipleDatabases: true } : {} }),
      selectedSidebarItem: () => null,
      schemaTables: () => [
        { schema: "public", tables: [usersA, ordersA], routines: [] },
        { schema: "audit", tables: [logA], routines: [] },
      ],
    },
    actions: {
      loadDatabaseEntities,
      updateDatabaseTableColumns: vi.fn(),
    },
    modules: {
      pins: { namespaced: true, state: { pins: opts.pins ?? [] } },
      hideEntities: { namespaced: true, state: { entities: opts.hiddenEntities ?? [], schemas: [] } },
    },
  });
  return { store, loadDatabaseEntities };
}

let wrapper: Wrapper<Vue>;

function mountList(opts: Options = {}) {
  const { store, loadDatabaseEntities } = makeStore(opts);
  wrapper = mount(VirtualTableList, {
    localVue,
    store,
    mocks: {
      $bksConfig: { ui: { tableList: { itemHeight: 20 } } },
      $bks: { openMenu: vi.fn() },
    },
  });
  return { store, loadDatabaseEntities, vm: wrapper.vm as any };
}

const databaseRows = () => wrapper.findAll(".database-item");
const tableNames = () => wrapper.findAll(".table-item .table-name").wrappers.map((w) => w.text());
const displayKeys = (vm: any) => vm.displayItems.map((i: any) => i.key);

beforeAll(() => {
  (globalThis as any).ResizeObserver = class { observe() {} disconnect() {} };
});

afterEach(() => wrapper?.destroy());

describe("VirtualTableList database tree", () => {
  it("renders one node per database with the default expanded", async () => {
    const { vm } = mountList();
    await Vue.nextTick();

    const rows = databaseRows();
    expect(rows).toHaveLength(3);
    expect(rows.wrappers.map((r) => r.find(".table-name").text())).toEqual(["a", "b", "c"]);
    const expanded = vm.items.filter((i: any) => i.type === "database").map((i: any) => [i.entity, i.expanded]);
    expect(expanded).toEqual([["a", true], ["b", false], ["c", false]]);
    expect(tableNames()).toEqual(expect.arrayContaining(["users", "orders"]));
  });

  it("expanding a database loads it once", async () => {
    const { store, vm, loadDatabaseEntities } = mountList();
    const b = vm.items.find((i: any) => i.key === "database::b");

    vm.handleExpand(null, b);
    expect(loadDatabaseEntities).toHaveBeenCalledTimes(1);
    expect(loadDatabaseEntities.mock.calls[0][1]).toEqual({ database: "b", force: false });

    store.state.databaseEntities = {
      b: { status: "loaded", tables: [usersB, eventsB, salesB], routines: [] },
    };
    await Vue.nextTick();
    await Vue.nextTick();

    const b2 = vm.items.find((i: any) => i.key === "database::b");
    const bSchemas = vm.items.filter((i: any) => i.type === "schema" && i.parent === b2);
    expect(bSchemas.map((i: any) => i.entity)).toEqual(["public", "reporting"]);
    const shownSchemas = vm.displayItems.filter((i: any) => i.type === "schema" && i.parent === b2).map((i: any) => i.entity);
    expect(shownSchemas).toEqual(["public", "reporting"]);
    const bChildren = vm.displayItems.filter((i: any) => i.type === "table" && i.database === "b").map((i: any) => i.entity.name);
    expect(bChildren).toEqual(["users", "events"]);
    expect(tableNames()).toEqual(expect.arrayContaining(["events"]));
  });

  it("shows loading and error with retry", async () => {
    const { store, vm, loadDatabaseEntities } = mountList({
      databaseEntities: { b: { status: "loading", tables: [], routines: [] } },
    });
    vm.items.find((i: any) => i.key === "database::b").expanded = true;
    vm.generateDisplayItems();
    await Vue.nextTick();
    expect(wrapper.find(".database-status").text()).toBe("Loading...");

    store.state.databaseEntities = {
      b: { status: "error", tables: [], routines: [], error: "permission denied for database b" },
    };
    await Vue.nextTick();
    await Vue.nextTick();
    const status = wrapper.find(".database-status.error");
    expect(status.text()).toContain("permission denied for database b");

    loadDatabaseEntities.mockClear();
    await status.find(".retry").trigger("click");
    expect(loadDatabaseEntities).toHaveBeenCalledTimes(1);
    expect(loadDatabaseEntities.mock.calls[0][1]).toEqual({ database: "b", force: true });
  });

  it("collapsing a database hides every descendant", async () => {
    const { vm } = mountList();
    const a = vm.items.find((i: any) => i.key === "database::a");
    const publicSchema = vm.items.find((i: any) => i.type === "schema" && i.entity === "public" && i.parent === a);
    expect(publicSchema.expanded).toBe(true);

    vm.handleExpand(null, a);
    const underA = vm.displayItems.filter((i: any) => {
      for (let p = i.parent; p; p = p.parent) if (p === a) return true;
      return false;
    });
    expect(underA).toHaveLength(0);
    expect(displayKeys(vm)).toEqual(["database::a", "database::b", "database::c"]);
  });

  it("no database level when multipleDatabases is disabled", async () => {
    const { vm } = mountList({ multipleDatabasesDisabled: true });
    await Vue.nextTick();
    expect(databaseRows()).toHaveLength(0);
    const schemas = vm.items.filter((i: any) => i.type === "schema");
    expect(schemas.map((s: any) => [s.entity, s.level])).toEqual([["public", 0], ["audit", 0]]);
  });

  it("pins and hidden entities apply per database", async () => {
    const pin = { databaseName: "b", schemaName: "public", entityName: "users", entityType: "table" };
    // users exists in both databases; only b's copy is pinned and hidden
    const hidden = { databaseName: "b", schemaName: "public", entityName: "users", entityType: "table" };
    const { vm } = mountList({
      pins: [pin],
      hiddenEntities: [hidden],
      databaseEntities: { b: { status: "loaded", tables: [usersB, eventsB], routines: [] } },
    });

    const item = (database: string | null, name: string) =>
      vm.items.find((i: any) => i.type === "table" && i.database === database && i.entity.name === name);

    expect(item("b", "users").pinned).toBe(true);
    expect(item(null, "users").pinned).toBe(false);
    expect(item("b", "users").hidden).toBe(true);
    expect(item(null, "users").hidden).toBe(false);
    expect(item("b", "events").hidden).toBe(false);
  });
});
