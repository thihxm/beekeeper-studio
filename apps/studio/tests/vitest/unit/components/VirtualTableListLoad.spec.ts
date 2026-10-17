import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { createLocalVue, mount, Wrapper } from "@vue/test-utils";
import Vue from "vue";
import { AppEventMixin } from "@/common/AppEvent";
import store from "@/store";
import VirtualTableList from "@/components/sidebar/core/table_list/VirtualTableList.vue";

// The tree on the real store: expanding a database goes through the real
// loadDatabaseEntities action and databaseEntities mutation. Only the
// utility ($util.send) is faked, answering per database.

const localVue = createLocalVue();
localVue.mixin(AppEventMixin);
localVue.config.ignoredElements = [/^x-/];
localVue.directive("tooltip", {});

const ENTITIES: Record<string, any> = {
  "conn/listTables": { b: [{ name: "orders", schema: "public" }] },
  "conn/listViews": { b: [] },
  "conn/listMaterializedViews": { b: [] },
  "conn/listRoutines": { b: [] },
};

function deferred() {
  let resolve: (v: any) => void;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

let send: ReturnType<typeof vi.fn>;
let wrapper: Wrapper<Vue>;

beforeAll(() => {
  (globalThis as any).ResizeObserver = class { observe() {} disconnect() {} };
});

beforeEach(() => {
  send = vi.fn(async (channel: string, args: any = {}) => ENTITIES[channel]?.[args.database] ?? []);
  Vue.prototype.$util = { send };
  store.commit("clearConnection");
  store.commit("newConnection", { connectionType: "postgresql", defaultDatabase: "a" });
  store.commit("databaseList", ["a", "b"]);
});

afterEach(() => wrapper?.destroy());

function mountTree() {
  wrapper = mount(VirtualTableList, {
    localVue,
    store,
    mocks: {
      $bksConfig: { ui: { tableList: { itemHeight: 20 } } },
      $bks: { openMenu: vi.fn() },
    },
  });
  return wrapper.vm as any;
}

const databaseItem = (vm: any, name: string) => vm.items.find((i: any) => i.key === `database::${name}`);
const tableNames = () => wrapper.findAll(".table-item .table-name").wrappers.map((w) => w.text());

describe("VirtualTableList loading another database", () => {
  it("shows a non-default database's tables once it loads, without a refresh", async () => {
    const tables = deferred();
    send.mockImplementation(async (channel: string, args: any = {}) => {
      if (channel === "conn/listTables" && args.database === "b") return tables.promise;
      return ENTITIES[channel]?.[args.database] ?? [];
    });
    const vm = mountTree();

    vm.handleExpand(null, databaseItem(vm, "b"));
    await flush();
    expect(databaseItem(vm, "b").status).toBe("loading");
    expect(wrapper.find(".database-status").text()).toBe("Loading...");

    tables.resolve(ENTITIES["conn/listTables"].b);
    await flush();
    await Vue.nextTick();

    expect(store.state.databaseEntities.b.status).toBe("loaded");
    expect(databaseItem(vm, "b").status).toBe("loaded");
    expect(wrapper.find(".database-status").exists()).toBe(false);
    expect(tableNames()).toContain("orders");
  });

  it("shows a load error, and the retry's result", async () => {
    let fail = true;
    send.mockImplementation(async (channel: string, args: any = {}) => {
      if (channel === "conn/listTables" && args.database === "b" && fail) {
        throw new Error("connection refused");
      }
      return ENTITIES[channel]?.[args.database] ?? [];
    });
    const vm = mountTree();

    vm.handleExpand(null, databaseItem(vm, "b"));
    await flush();
    await Vue.nextTick();
    expect(databaseItem(vm, "b").status).toBe("error");
    expect(wrapper.find(".database-status.error").text()).toContain("connection refused");

    fail = false;
    vm.handleRetry(null, databaseItem(vm, "b"));
    await flush();
    await Vue.nextTick();
    expect(databaseItem(vm, "b").status).toBe("loaded");
    expect(tableNames()).toContain("orders");
  });
});
