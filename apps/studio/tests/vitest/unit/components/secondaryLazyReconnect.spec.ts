import { describe, it, expect, vi } from "vitest";
import { createLocalVue, mount } from "@vue/test-utils";
import Vue from "vue";
import Vuex from "vuex";
import TabWithTable from "@/components/common/TabWithTable.vue";
import TabQueryEditor from "@/components/TabQueryEditor.vue";
import { ConnectionTreeModule } from "@/store/modules/ConnectionTreeModule";

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.config.ignoredElements = [/^x-/];

const C = { id: 7, name: "shop-mysql", connectionType: "mysql", defaultDatabase: "shop" };
const D = { id: 9, name: "reports", connectionType: "postgresql", defaultDatabase: "reports" };

// the query tab with its own connect-once-active wiring, without the editor around it
const editor = Vue.extend(TabQueryEditor as any).options;
const QueryTab = {
  props: ["tab", "active"],
  computed: { activeTarget: editor.computed.activeTarget },
  watch: { activeTarget: editor.watch.activeTarget },
  render: (h) => h("div"),
};

const settle = async () => {
  for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0));
};

function setup() {
  const send = vi.fn(async (name: string) => (name.startsWith("conn/list") ? [] : null));
  Vue.prototype.$util = { send, sId: "w1" };
  const store = new Vuex.Store({
    state: { tablesInitialLoaded: true, database: "a", databaseEntities: {}, inaccessibleDatabases: [], username: "tester" },
    getters: {
      connectionContext: () => (id: number | null) => ({ connectionId: id, missing: false }),
      tablesFor: () => () => [],
    },
    modules: { connectionTree: ConnectionTreeModule },
  });
  store.commit("connectionTree/savedConnections", [C, D]);
  const dispatch = vi.spyOn(store, "dispatch");
  const opened = () => dispatch.mock.calls.filter(([name]) => name === "connectionTree/open").map(([, id]) => id);
  const created = () => send.mock.calls.filter(([name]) => name === "conn/create").map(([, args]: any) => args.sId);
  return { store, opened, created };
}

describe("restored tabs on saved connections", () => {
  it("hidden restored tabs open no connection until one is activated", async () => {
    const { store, opened, created } = setup();
    const tableTab = mount(TabWithTable, {
      localVue,
      store,
      propsData: { tab: { id: 1, tabType: "table", tableName: "users", targetConnectionId: 7, databaseName: "shop" }, active: false },
    });
    const queryTab = mount(QueryTab, {
      localVue,
      store,
      propsData: { tab: { id: 2, tabType: "query", targetConnectionId: 9, databaseName: "reports" }, active: false },
    });
    await settle();

    expect(opened()).toEqual([]);
    expect(created()).toEqual([]);

    await tableTab.setProps({ active: true });
    await settle();

    expect(opened()).toEqual([7]);
    expect(created()).toEqual(["w1::connection::7"]);
    expect(store.getters["connectionTree/connection"](9).status).toBe("idle");

    await tableTab.setProps({ active: false });
    await queryTab.setProps({ active: true });
    await settle();

    expect(opened()).toEqual([7, 9]);
    expect(created()).toEqual(["w1::connection::7", "w1::connection::9"]);
    expect(store.getters["connectionTree/connection"](9).databaseEntities.reports.status).toBe("loaded");
  });
});
