import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLocalVue, mount } from "@vue/test-utils";
import Vue from "vue";
import Vuex from "vuex";
import QueryDatabaseSelector from "@/components/editor/QueryDatabaseSelector.vue";
import TabQueryEditor from "@/components/TabQueryEditor.vue";
import { ElectronUtilityConnectionClient } from "@/lib/utility/ElectronUtilityConnectionClient";
import { connectionForTab } from "@/lib/utility/tabConnection";

const localVue = createLocalVue();
localVue.use(Vuex);

const editorOptions = (TabQueryEditor as any).options ?? TabQueryEditor;

function store() {
  return new Vuex.Store({ state: { database: "a", databaseList: ["a", "b", "c"] } });
}

/** the selector as the query editor renders it: the tab and the editor's transaction state */
function mountSelector(tab: any, editorState: { hasActiveTransaction?: boolean; isManualCommit?: boolean } = {}) {
  return mount(QueryDatabaseSelector, { localVue, store: store(), propsData: { tab, ...editorState } });
}

const selected = (wrapper) => (wrapper.find("select").element as HTMLSelectElement).value;

describe("QueryDatabaseSelector", () => {
  let send: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    send = vi.fn(async () => "query-id");
    Vue.prototype.$util = { send };
  });

  it("shows the tab database", () => {
    expect(selected(mountSelector({ tabType: "query", databaseName: "b" }))).toBe("b");
    expect(selected(mountSelector({ tabType: "query", databaseName: "a" }))).toBe("a");
    // a tab from before the column existed runs on the default database, and says so
    expect(selected(mountSelector({ tabType: "query", databaseName: null }))).toBe("a");
  });

  it("changes the tab database", async () => {
    const tab = { id: 1, tabType: "query", databaseName: "a" };
    const wrapper = mountSelector(tab);
    const select = wrapper.find("select");
    (select.element as HTMLSelectElement).value = "b";
    await select.trigger("change");

    expect(tab.databaseName).toBe("b");
    expect(wrapper.emitted("change")[0]).toEqual(["b"]);

    // the editor persists the change, and its next run goes to b
    const ctx = { tab, updateTab: vi.fn(), $store: { dispatch: vi.fn() } };
    editorOptions.methods.saveTabDatabase.call(ctx);
    expect(ctx.$store.dispatch).toHaveBeenCalledWith("tabs/save", tab);

    const connectionStore = {
      getters: {
        connectionFor: (db: string) => connectionForTab(new ElectronUtilityConnectionClient(), { databaseName: db }, "a"),
      },
    };
    const connection = editorOptions.computed.connection.call({ tab, $store: connectionStore });
    await connection.query("select 1", tab.id);
    expect(send.mock.calls[0][0]).toBe("conn/query");
    expect(send.mock.calls[0][1]).toMatchObject({ database: "b" });
  });

  it("disabled during a transaction or reserved connection", async () => {
    for (const editorState of [
      { hasActiveTransaction: true, isManualCommit: false },
      { hasActiveTransaction: false, isManualCommit: true },
    ]) {
      const tab = { tabType: "query", databaseName: "a" };
      const wrapper = mountSelector(tab, editorState);
      const select = wrapper.find("select");
      expect(select.attributes("disabled")).toBe("disabled");

      (select.element as HTMLSelectElement).value = "b";
      await select.trigger("change");
      expect(tab.databaseName).toBe("a");
      expect(wrapper.emitted("change")).toBeUndefined();
    }

    const idle = mountSelector({ tabType: "query", databaseName: "a" });
    expect(idle.find("select").attributes("disabled")).toBeUndefined();
  });

  it("lists and changes databases of the tab connection", async () => {
    // the window is on `a`; saved connection 7, opened from the tree, has `audit` and `shop`
    const contexts = {
      7: { database: "shop", databaseList: ["audit", "shop"] },
      null: { database: "a", databaseList: ["a", "b", "c"] },
    };
    const windowStore = new Vuex.Store({
      state: { database: "a", databaseList: ["a", "b", "c"] },
      getters: { connectionContext: () => (id: number | null) => contexts[id ?? "null"] },
    });
    const tab = { id: 9, tabType: "query", targetConnectionId: 7, databaseName: "shop" };
    const wrapper = mount(QueryDatabaseSelector, { localVue, store: windowStore, propsData: { tab } });

    expect(wrapper.findAll("option").wrappers.map((o) => o.text())).toEqual(["audit", "shop"]);
    const select = wrapper.find("select");
    (select.element as HTMLSelectElement).value = "audit";
    await select.trigger("change");

    expect(tab.databaseName).toBe("audit");
    expect(tab.targetConnectionId).toBe(7);
    expect(windowStore.state.database).toBe("a");
  });
});
