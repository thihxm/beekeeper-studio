import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import Vue from "vue";
import QueryDatabaseSelector from "@/components/editor/QueryDatabaseSelector.vue";
import TabQueryEditor from "@/components/TabQueryEditor.vue";
import { ElectronUtilityConnectionClient } from "@/lib/utility/ElectronUtilityConnectionClient";
import { connectionForTab } from "@/lib/utility/tabConnection";

const editorOptions = (TabQueryEditor as any).options ?? TabQueryEditor;

describe("QueryDatabaseSelector", () => {
  let send: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    send = vi.fn(async () => "query-id");
    Vue.prototype.$util = { send };
  });

  it("shows the tab database", () => {
    const bound = mount(QueryDatabaseSelector, { propsData: { database: "b", databases: ["a", "b", "c"] } });
    expect((bound.find("select").element as HTMLSelectElement).value).toBe("b");
    expect(bound.find("option:checked").text()).toBe("b");

    const onDefault = mount(QueryDatabaseSelector, { propsData: { database: "a", databases: ["a", "b", "c"] } });
    expect((onDefault.find("select").element as HTMLSelectElement).value).toBe("a");
  });

  it("changes the tab database", async () => {
    const wrapper = mount(QueryDatabaseSelector, { propsData: { database: "a", databases: ["a", "b"] } });
    const select = wrapper.find("select");
    (select.element as HTMLSelectElement).value = "b";
    await select.trigger("change");
    expect(wrapper.emitted("change")[0]).toEqual(["b"]);

    // what the query editor does with that event, and where the next run goes
    const tab = { id: 1, tabType: "query", databaseName: "a" };
    const ctx = {
      tab,
      hasActiveTransaction: false,
      isManualCommit: false,
      updateTab: vi.fn(),
      $store: { dispatch: vi.fn() },
    };
    editorOptions.methods.changeTabDatabase.call(ctx, "b");
    expect(tab.databaseName).toBe("b");
    expect(ctx.$store.dispatch).toHaveBeenCalledWith("tabs/save", tab);

    const store = {
      getters: {
        connectionFor: (db: string) => connectionForTab(new ElectronUtilityConnectionClient(), { databaseName: db }, "a"),
      },
    };
    const connection = editorOptions.computed.connection.call({ tab, $store: store });
    await connection.query("select 1", tab.id);
    expect(send.mock.calls[0][0]).toBe("conn/query");
    expect(send.mock.calls[0][1]).toMatchObject({ database: "b" });
  });

  it("disabled during a transaction or reserved connection", () => {
    const wrapper = mount(QueryDatabaseSelector, {
      propsData: { database: "a", databases: ["a", "b"], disabled: true },
    });
    expect(wrapper.find("select").attributes("disabled")).toBe("disabled");

    // the editor passes hasActiveTransaction || isManualCommit and ignores changes meanwhile
    for (const state of [{ hasActiveTransaction: true, isManualCommit: false }, { hasActiveTransaction: false, isManualCommit: true }]) {
      const tab = { databaseName: "a" };
      editorOptions.methods.changeTabDatabase.call({ tab, ...state, updateTab: vi.fn(), $store: { dispatch: vi.fn() } }, "b");
      expect(tab.databaseName).toBe("a");
    }
  });
});
