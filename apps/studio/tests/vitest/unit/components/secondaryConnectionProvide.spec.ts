import { describe, it, expect, vi } from "vitest";
import { createLocalVue, mount } from "@vue/test-utils";
import Vue from "vue";
import Vuex from "vuex";
import { getDialectData } from "@shared/lib/dialects";
import TableTable from "@/components/tableview/TableTable.vue";
import TabTableProperties from "@/components/TabTableProperties.vue";
import TabQueryEditor from "@/components/TabQueryEditor.vue";
import { TabDatabaseMixin } from "@/mixins/TabDatabase";
import { ElectronUtilityConnectionClient } from "@/lib/utility/ElectronUtilityConnectionClient";
import { ConnectionTreeModule } from "@/store/modules/ConnectionTreeModule";

// The tab components hand the connection they run on to every child through
// their real `provide`; a child built on the real mixin reads it back.
const localVue = createLocalVue();
localVue.use(Vuex);

const windowClient = new ElectronUtilityConnectionClient();
const contexts: Record<string, any> = {
  window: { dialect: "postgresql", dialectData: getDialectData("postgresql"), database: "a", config: { id: 3 } },
  7: { dialect: "mysql", dialectData: getDialectData("mysql"), database: "shop", config: { id: 7, readOnlyMode: true } },
};

function store() {
  return new Vuex.Store({
    state: { database: "a", connection: windowClient },
    getters: {
      connectionContext: () => (id: number | null) => contexts[id ?? "window"],
      connectionFor: () => (db: string | null, id: number | null) =>
        id == null ? windowClient : windowClient.forConnection({ sId: `w1::connection::${id}` }).forDatabase(db),
    },
  });
}

const Child = { name: "TabChild", mixins: [TabDatabaseMixin], render: (h) => h("div") };

function childUnder(tabComponent: any, tab: any) {
  const provide = (tabComponent.options ?? tabComponent).provide;
  const Parent = { data: () => ({ tab }), provide, render(h) { return h(Child); } };
  return mount(Parent, { localVue, store: store() }).findComponent(Child).vm as any;
}

describe("tabs hand their connection to child components", () => {
  for (const [name, component] of [
    ["TableTable", TableTable],
    ["TabTableProperties", TabTableProperties],
    ["TabQueryEditor", TabQueryEditor],
  ] as const) {
    it(`${name} children run on the tab connection`, () => {
      const child = childUnder(component, { id: 1, targetConnectionId: 7, databaseName: "audit" });
      expect(child.dialect).toBe("mysql");
      expect(child.usedConfig.readOnlyMode).toBe(true);
      expect(child.database).toBe("audit");
      expect(child.connection.session.sId).toBe("w1::connection::7");
      expect(child.connection.database).toBe("audit");

      // a tab on the window's connection keeps the window's
      const onWindow = childUnder(component, { id: 2, targetConnectionId: null, databaseName: null });
      expect(onWindow.dialect).toBe("postgresql");
      expect(onWindow.database).toBe("a");
      expect(onWindow.connection).toBe(windowClient);
    });
  }
});

describe("query tab on a saved connection", () => {
  const editor = Vue.extend(TabQueryEditor as any).options;

  it("query tab transactions keep its connection from disconnecting", () => {
    const appStore = new Vuex.Store({ modules: { connectionTree: ConnectionTreeModule } });
    const run = (state: { hasActiveTransaction: boolean, isManualCommit: boolean }) => {
      const ctx: any = { tab: { id: 21, targetConnectionId: 7 }, $store: appStore, ...state };
      editor.watch.busyOnConnection.handler.call(ctx, editor.computed.busyOnConnection.call(ctx));
    };

    run({ hasActiveTransaction: true, isManualCommit: false });
    expect(appStore.state.connectionTree.busyTabs).toEqual({ 21: 7 });
    run({ hasActiveTransaction: false, isManualCommit: true });
    expect(appStore.state.connectionTree.busyTabs).toEqual({ 21: 7 });
    run({ hasActiveTransaction: false, isManualCommit: false });
    expect(appStore.state.connectionTree.busyTabs).toEqual({});
  });

  it("query tab keep alive goes to its connection", async () => {
    const send = vi.fn(async () => undefined);
    Vue.prototype.$util = { send, sId: "w1" };
    const ctx: any = {
      showKeepAlive: true,
      maybeCloseWarningNoty: vi.fn(),
      tab: { id: 21, targetConnectionId: 7 },
      connection: windowClient.forConnection({ sId: "w1::connection::7" }),
    };

    await editor.methods.keepAliveTransaction.call(ctx);

    expect(send).toHaveBeenCalledWith("conn/resetTransactionTimeout", { tabId: 21, sId: "w1::connection::7" });
  });
});
