import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { createLocalVue, mount, Wrapper } from "@vue/test-utils";
import Vuex from "vuex";
import Vue from "vue";
import { AppEventMixin, AppEvent } from "@/common/AppEvent";
import appStore from "@/store";
import { ConnectionTreeModule } from "@/store/modules/ConnectionTreeModule";
import { DatabaseLabelModule } from "@/store/modules/DatabaseLabelModule";
import VirtualTableList from "@/components/sidebar/core/table_list/VirtualTableList.vue";

// the app's own filter getters, so secondary connections are filtered like the window's
const root = (appStore as any)._modules.root._rawModule;

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.mixin(AppEventMixin);
localVue.config.ignoredElements = [/^x-/];
localVue.directive("tooltip", {});

const table = (name: string, schema = "public") => ({ name, schema, entityType: "table", columns: [] });

const WINDOW = { id: 3, name: "app", connectionType: "postgresql", workspaceId: -1, labelColor: "red" };
const C = { id: 7, name: "beta", connectionType: "mysql", defaultDatabase: "shop", workspaceId: -1, labelColor: "blue" };
const D = { id: 9, name: "Alpha", connectionType: "postgresql", defaultDatabase: "reports", workspaceId: -1, labelColor: "default" };
const E = { id: 11, name: "gamma", connectionType: "sqlite", workspaceId: -1, labelColor: "green" };
const SAVED = [WINDOW, C, D, E];

interface Options {
  scope?: string;
  pins?: number[];
  saved?: any[];
  usedConfig?: any;
  /** the connection sidebar's lazily loaded list */
  sidebarConnections?: any[];
  send?: (name: string, args: any) => Promise<any>;
}

let wrapper: Wrapper<Vue>;

function mountTree(opts: Options = {}) {
  const send = vi.fn(opts.send ?? (async (name: string) => (name === "appdb/saved/find" ? opts.saved ?? SAVED : null)));
  Vue.prototype.$util = { send, sId: "w1" };
  const store = new Vuex.Store({
    state: {
      database: "a",
      databaseList: ["a", "b"],
      databaseEntities: {},
      inaccessibleDatabases: [],
      tables: [table("users"), table("orders")],
      routines: [],
      entityFilter: { filterQuery: undefined, showTables: true, showViews: true, showRoutines: true, showPartitions: false },
      usedConfig: opts.usedConfig === undefined ? WINDOW : opts.usedConfig,
      workspaceId: -1,
      username: "tester",
      activeTab: null,
      "data/connections": { items: opts.sidebarConnections ?? [C] },
    },
    getters: {
      defaultSchema: () => "public",
      minimalMode: () => false,
      dialect: () => "postgresql",
      dialectData: () => ({ disabledFeatures: {} }),
      selectedSidebarItem: () => null,
      filteredTables: root.getters.filteredTables,
      filteredRoutines: root.getters.filteredRoutines,
      schemaTables: root.getters.schemaTables,
      schemas: root.getters.schemas,
      cloudClient: () => null,
    },
    mutations: {
      filterQuery: root.mutations.filterQuery,
    },
    actions: {
      loadDatabaseEntities: vi.fn(),
      updateDatabaseTableColumns: vi.fn(),
    },
    modules: {
      connectionTree: ConnectionTreeModule,
      settings: {
        namespaced: true,
        state: { scope: opts.scope },
        getters: {
          settings: (state: any) => (state.scope ? { connectionTreeScope: { value: state.scope } } : {}),
        },
        mutations: { scope: (state: any, value: string) => (state.scope = value) },
      },
      pinnedConnections: {
        namespaced: true,
        state: { pins: (opts.pins ?? []).map((connectionId, position) => ({ connectionId, position, workspaceId: -1 })) },
        mutations: { set: (state: any, pins: any[]) => (state.pins = pins) },
      },
      pins: { namespaced: true, state: { pins: [] } },
      hideEntities: { namespaced: true, state: { entities: [], schemas: [] } },
      databaseLabels: DatabaseLabelModule,
    },
  });
  wrapper = mount(VirtualTableList, {
    localVue,
    store,
    mocks: {
      $bksConfig: { ui: { tableList: { itemHeight: 20, revealActiveEntity: true } }, security: {} },
      $bks: { openMenu: vi.fn() },
      $copyText: vi.fn(),
    },
  });
  return { store, send, vm: wrapper.vm as any };
}

async function settle() {
  for (let i = 0; i < 4; i++) await Vue.nextTick();
  await new Promise((r) => setTimeout(r, 0));
  await Vue.nextTick();
}

const connectionNodes = (vm: any) => vm.items.filter((i: any) => i.type === "connection");
const connectionIds = (vm: any) => connectionNodes(vm).map((i: any) => (i.isWindow ? "window" : i.connectionId));
const item = (vm: any, key: string) => vm.items.find((i: any) => i.key === key);
/** the user opens a node that is already connected */
const expand = (vm: any, key: string) => {
  item(vm, key).expanded = true;
  vm.generateDisplayItems();
};

/** what connectionTree/open leaves behind for C */
function connectC(store: any, extra: any = {}) {
  store.commit("connectionTree/update", {
    id: 7,
    changes: {
      status: "connected",
      connectionType: "mysql",
      database: "shop",
      databaseList: ["audit", "shop"],
      inaccessibleDatabases: [],
      defaultSchema: null,
      ...extra,
    },
  });
  store.commit("connectionTree/databaseEntities", {
    id: 7,
    database: "shop",
    entities: { status: "loaded", tables: [table("users", null), table("orders", null)], routines: [] },
  });
}

beforeAll(() => {
  (globalThis as any).ResizeObserver = class { observe() {} disconnect() {} };
});

afterEach(() => wrapper?.destroy());

describe("connection level of the entity tree", () => {
  it("pinned scope lists pinned connections in pin order", async () => {
    const { vm } = mountTree({ pins: [9, 7] });
    await settle();

    expect(connectionIds(vm)).toEqual(["window", 9, 7]);
  });

  it("all scope lists every saved connection by name", async () => {
    // the connection sidebar has only loaded `beta`; the tree reads the full list
    const { vm, send } = mountTree({ scope: "all", sidebarConnections: [C] });
    await settle();

    expect(send).toHaveBeenCalledWith("appdb/saved/find", { options: { where: { workspaceId: -1 } } });
    expect(connectionNodes(vm).map((i: any) => i.entity)).toEqual(["app", "Alpha", "beta", "gamma"]);
  });

  it("no listed connection renders no connection level", async () => {
    const { vm } = mountTree({ pins: [] });
    await settle();

    expect(connectionNodes(vm)).toEqual([]);
    expect(vm.items.filter((i: any) => i.type === "database").map((i: any) => i.key)).toEqual(["database::a", "database::b"]);
    expect(item(vm, "database::a").parent.type).toBe("root");
  });

  it("window connection is first and expanded", async () => {
    const { vm } = mountTree({ pins: [7] });
    await settle();

    const [first] = connectionNodes(vm);
    expect(first.isWindow).toBe(true);
    expect(first.expanded).toBe(true);
    expect(item(vm, "database::a").parent).toBe(first);
    expect(vm.displayItems).toContain(item(vm, "database::a"));
  });

  it("connection nodes show name and saved color", async () => {
    mountTree({ pins: [7, 9] });
    await settle();

    const rows = wrapper.findAll(".connection-item");
    const beta = rows.wrappers.find((r) => r.text().includes("beta"));
    const alpha = rows.wrappers.find((r) => r.text().includes("Alpha"));
    expect(beta.find(".connection-label-color-blue").exists()).toBe(true);
    expect(alpha.find("[class*='connection-label-color-']").exists()).toBe(false);
  });

  it("connection level follows saved connection changes", async () => {
    const { store, vm, send } = mountTree({ pins: [7] });
    await settle();
    expect(connectionNodes(vm).map((i: any) => i.entity)).toEqual(["app", "beta"]);

    // pin another one
    store.commit("pinnedConnections/set", [7, 9].map((connectionId, position) => ({ connectionId, position })));
    await settle();
    expect(connectionIds(vm)).toEqual(["window", 7, 9]);

    // rename, recolor, create and delete: the saved list changes in the app database
    const changed = [WINDOW, { ...C, name: "beta-renamed", labelColor: "purple" }, { id: 13, name: "delta", workspaceId: -1 }];
    send.mockImplementation(async (name: string) => (name === "appdb/saved/find" ? changed : null));
    store.state["data/connections"].items = [...store.state["data/connections"].items, { id: 13 }];
    store.commit("pinnedConnections/set", [7, 9, 13].map((connectionId, position) => ({ connectionId, position })));
    await settle();

    const nodes = connectionNodes(vm);
    expect(nodes.map((i: any) => i.entity)).toEqual(["app", "beta-renamed", "delta"]);
    expect(nodes[1].color).toBe("purple");
    expect(send.mock.calls.filter(([name]) => name.startsWith("conn/"))).toEqual([]);
  });

  it("never lists unsaved connections", async () => {
    // the window runs on an unsaved config, and pin 50 points at a used-connection record that was never saved
    const unsaved = { id: null, name: "quick", connectionType: "postgresql" };
    const { vm } = mountTree({ scope: "all", usedConfig: unsaved, saved: [C, D] });
    await settle();
    expect(connectionIds(vm)).toEqual(["window", 9, 7]);

    const pinned = mountTree({ scope: "pinned", usedConfig: unsaved, saved: [C, D], pins: [50, 7] });
    await settle();
    expect(connectionIds(pinned.vm)).toEqual(["window", 7]);
  });

  it("off scope hides the connection level", async () => {
    const { vm } = mountTree({ scope: "off", pins: [7, 9] });
    await settle();

    expect(connectionNodes(vm)).toEqual([]);
  });

  it("connecting node shows loading", async () => {
    let finishCreate: () => void;
    const { vm } = mountTree({
      pins: [7],
      send: async (name: string) => {
        if (name === "appdb/saved/find") return SAVED;
        if (name === "conn/create") return new Promise<void>((r) => (finishCreate = r));
        if (name === "conn/listDatabases") return ["audit", "shop"];
        if (name.startsWith("conn/list")) return [];
        return null;
      },
    });
    await settle();

    vm.handleExpand(null, item(vm, "connection::7"));
    await settle();
    expect(wrapper.find(".connection-item .connection-status").text()).toBe("Connecting...");

    finishCreate();
    await settle();
    expect(wrapper.find(".connection-status").exists()).toBe(false);
    expect(item(vm, "connection::7").status).toBe("connected");
  });

  it("connected secondary connection renders its databases", async () => {
    const { store, vm } = mountTree({ pins: [7, 11] });
    await settle();
    connectC(store);
    await settle();
    expand(vm, "connection::7");

    const c = item(vm, "connection::7");
    const databases = vm.items.filter((i: any) => i.type === "database" && i.parent === c);
    expect(databases.map((i: any) => [i.entity, i.expanded])).toEqual([["audit", false], ["shop", true]]);
    const shown = vm.displayItems.filter((i: any) => i.type === "table" && i.connectionId === 7).map((i: any) => `${i.database}:${i.entity.name}`);
    expect(shown).toEqual(["shop:users", "shop:orders"]);

    // sqlite has no databases on one connection: entities hang off the connection node
    store.commit("connectionTree/update", { id: 11, changes: { status: "connected", connectionType: "sqlite", database: null, databaseList: [] } });
    store.commit("connectionTree/databaseEntities", { id: 11, database: null, entities: { status: "loaded", tables: [table("notes", null)], routines: [] } });
    await settle();
    const notes = vm.items.find((i: any) => i.connectionId === 11 && i.type === "table");
    expect(notes.parent).toBe(item(vm, "connection::11"));
  });

  it("disconnect is disabled while a tab transaction is open", async () => {
    const { store, vm } = mountTree({ pins: [7] });
    connectC(store);
    await settle();
    const disconnect = () => item(vm, "connection::7").contextMenu.find((o: any) => o.slug === "connection-disconnect");

    expect(disconnect().class).toBe("");
    store.commit("connectionTree/tabBusy", { tabId: 21, connectionId: 7, busy: true });
    await settle();
    expect(disconnect().class).toBe("disabled");
    // a reserved connection counts the same; one tab still busy keeps it disabled
    store.commit("connectionTree/tabBusy", { tabId: 22, connectionId: 7, busy: true });
    store.commit("connectionTree/tabBusy", { tabId: 21, connectionId: 7, busy: false });
    await settle();
    expect(disconnect().class).toBe("disabled");
    store.commit("connectionTree/tabBusy", { tabId: 22, connectionId: 7, busy: false });
    await settle();
    expect(disconnect().class).toBe("");
  });

  it("filter applies to secondary connections", async () => {
    const { store, vm } = mountTree({ pins: [7] });
    connectC(store);
    store.commit("connectionTree/databaseEntities", { id: 7, database: "audit", entities: { status: "loaded", tables: [table("log", null)], routines: [] } });
    await settle();
    // C was never expanded by hand
    expect(item(vm, "connection::7").expanded).toBe(false);

    store.commit("filterQuery", "use");
    await settle();

    const shown = vm.displayItems.filter((i: any) => i.type === "table" && i.connectionId === 7).map((i: any) => `${i.database}:${i.entity.name}`);
    expect(shown).toEqual(["shop:users"]);
    expect(vm.displayItems).not.toContain(item(vm, "connection::7::database::audit"));
  });

  it("secondary nodes offer only their actions", async () => {
    const { store, vm } = mountTree({ pins: [7] });
    connectC(store);
    await settle();

    const names = (i: any) => i.contextMenu.filter((o: any) => o.name).map((o: any) => o.name);
    expect(names(item(vm, "connection::7"))).toEqual(["New query", "Refresh", "Disconnect"]);
    expect(names(item(vm, "connection::7::database::shop"))).toEqual(["New query", "Set color"]);
    const users = vm.items.find((i: any) => i.connectionId === 7 && i.type === "table" && i.entity.name === "users");
    expect(names(users)).toEqual(["View Data", "View Structure", "New query", "Copy Name"]);
  });

  it("databases of every connection offer New query and Set color", async () => {
    const { store, vm } = mountTree({ pins: [7] });
    connectC(store);
    await settle();

    const names = (i: any) => i.contextMenu.filter((o: any) => o.name).map((o: any) => o.name);
    expect(names(item(vm, "database::a"))).toEqual(["New query", "Set color"]);
    expect(names(item(vm, "database::b"))).toEqual(["New query", "Set color"]);
    expect(names(item(vm, "connection::7::database::audit"))).toEqual(["New query", "Set color"]);
  });

  it("database menu actions act on the node connection and database", async () => {
    const { store, vm } = mountTree({ pins: [7] });
    connectC(store);
    await settle();
    const newQuery = vi.fn();
    const setColor = vi.fn();
    vm.$root.$on(AppEvent.newQueryOnConnection, newQuery);
    vm.$root.$on(AppEvent.openDatabaseColorModal, setColor);
    // the menu hands each handler the node's entity, as Item.vue opens it
    const run = (key: string, slug: string) => {
      const node = item(vm, key);
      node.contextMenu.find((o: any) => o.slug === slug).handler({ item: node.entity });
    };

    run("database::b", "database-new-query");
    run("database::b", "database-color");
    run("connection::7::database::audit", "database-new-query");
    run("connection::7::database::audit", "database-color");

    expect(newQuery.mock.calls).toEqual([[{ connectionId: null, database: "b" }], [{ connectionId: 7, database: "audit" }]]);
    expect(setColor.mock.calls).toEqual([["b"], [{ connectionId: 7, database: "audit" }]]);
  });

  it("secondary databases show their color", async () => {
    const { store, vm } = mountTree({ pins: [7] });
    await settle();
    connectC(store);
    await settle();
    expand(vm, "connection::7");
    store.commit("databaseLabels/setOn", { connectionId: 7, labels: [{ id: 1, connectionId: 7, workspaceId: -1, databaseName: "audit", color: "purple" }] });
    await settle();

    expect(item(vm, "connection::7::database::audit").color).toBe("purple");
    expect(item(vm, "connection::7::database::shop").color).toBeNull();
    const audit = wrapper.findAll(".database-item").wrappers.find((r) => r.text().includes("audit"));
    expect(audit.find(".connection-label-color-purple").exists()).toBe(true);
  });

  it("failed connection shows its error and retries", async () => {
    const { store, vm, send } = mountTree({ pins: [7] });
    store.commit("connectionTree/update", { id: 7, changes: { status: "error", error: "ER_ACCESS_DENIED_ERROR: Access denied for user" } });
    await settle();

    const status = wrapper.find(".connection-item .connection-status.error");
    expect(status.text()).toContain("Access denied for user");
    send.mockClear();
    await status.find(".retry").trigger("click");
    await settle();

    expect(send.mock.calls.some(([name]) => name === "conn/create")).toBe(true);
    expect(item(vm, "connection::7")).toBeDefined();
  });

  it("secondary connection shows locked databases and schema groups", async () => {
    const { store, vm } = mountTree({ pins: [7] });
    connectC(store, { databaseList: ["audit", "secret", "shop"], inaccessibleDatabases: ["secret"] });
    store.commit("connectionTree/databaseEntities", {
      id: 7,
      database: "shop",
      entities: { status: "loaded", tables: [table("users", "app"), table("orders", "sales")], routines: [] },
    });
    await settle();
    expand(vm, "connection::7");

    const secret = item(vm, "connection::7::database::secret");
    expect(secret.locked).toBe(true);
    expect(secret.expanded).toBe(false);
    vm.handleExpand(null, secret);
    expect(secret.expanded).toBe(false);

    const shop = item(vm, "connection::7::database::shop");
    const schemas = vm.items.filter((i: any) => i.type === "schema" && i.parent === shop).map((i: any) => i.entity);
    expect(schemas).toEqual(["app", "sales"]);
    const users = vm.items.find((i: any) => i.connectionId === 7 && i.entity?.name === "users");
    expect(users.parent.type).toBe("schema");
    expect(users.parent.entity).toBe("app");
  });

  it("filter keeps unloaded secondary nodes collapsed", async () => {
    const { store, vm } = mountTree({ pins: [7, 9] });
    connectC(store, { databaseList: ["audit", "reports", "secret", "shop", "staging"], inaccessibleDatabases: ["secret"] });
    store.commit("connectionTree/databaseEntities", { id: 7, database: "staging", entities: { status: "error", tables: [], routines: [], error: "boom" } });
    store.commit("connectionTree/databaseEntities", { id: 7, database: "reports", entities: { status: "loading", tables: [], routines: [] } });
    await settle();

    store.commit("filterQuery", "use");
    await settle();

    // D is not connected; C's audit is idle, reports loading, secret locked, staging failed
    for (const key of ["connection::9", "connection::7::database::audit", "connection::7::database::reports", "connection::7::database::secret", "connection::7::database::staging"]) {
      const node = item(vm, key);
      expect(vm.displayItems).toContain(node);
      expect(node.expanded).toBe(false);
      // and drawn closed: the row's chevron comes from isOpen, not the stored flag
      expect(vm.isOpen(node)).toBe(false);
      expect(vm.displayItems.filter((i: any) => i.parent === node)).toEqual([]);
    }
  });

  it("filter shows a secondary database that loads during the filter", async () => {
    const { store, vm } = mountTree({ pins: [7] });
    connectC(store);
    await settle();
    store.commit("filterQuery", "use");
    await settle();
    expect(vm.displayItems.some((i: any) => i.connectionId === 7 && i.entity?.name === "user_audit")).toBe(false);

    store.commit("connectionTree/databaseEntities", { id: 7, database: "audit", entities: { status: "loaded", tables: [table("user_audit", null)], routines: [] } });
    await settle();

    expect(vm.displayItems.some((i: any) => i.connectionId === 7 && i.entity?.name === "user_audit")).toBe(true);
    expect(item(vm, "connection::7::database::audit").expanded).toBe(false);
  });

  it("clearing the filter restores secondary expansion", async () => {
    const { store, vm } = mountTree({ pins: [7] });
    connectC(store);
    await settle();
    store.commit("filterQuery", "use");
    await settle();
    expect(vm.displayItems.some((i: any) => i.connectionId === 7 && i.entity?.name === "users")).toBe(true);

    store.commit("filterQuery", null);
    await settle();

    expect(item(vm, "connection::7").expanded).toBe(false);
    expect(vm.displayItems.some((i: any) => i.connectionId === 7 && i.type === "table")).toBe(false);

    // a click during the filter is what the tree keeps afterwards
    store.commit("filterQuery", "use");
    await settle();
    vm.handleExpand(null, item(vm, "connection::7"));
    await settle();
    store.commit("filterQuery", null);
    await settle();

    expect(item(vm, "connection::7").expanded).toBe(true);
    expect(vm.displayItems.some((i: any) => i.connectionId === 7 && i.entity?.name === "users")).toBe(true);
  });
});
