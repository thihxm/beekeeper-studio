import { describe, it, expect, vi } from "vitest";
import { createLocalVue, mount } from "@vue/test-utils";
import Vue from "vue";
import Vuex from "vuex";
import TabWithTable from "@/components/common/TabWithTable.vue";

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.config.ignoredElements = [/^x-/];

describe("a tab on a saved connection", () => {
  it("tab on a deleted saved connection shows not found", async () => {
    const send = vi.fn(async () => null);
    Vue.prototype.$util = { send, sId: "w1" };
    const dispatch = vi.fn();
    const store = new Vuex.Store({
      state: { tablesInitialLoaded: true, database: "a", databaseEntities: {}, inaccessibleDatabases: [] },
      getters: {
        // the workspace's saved connections are loaded, and none has id 42
        connectionContext: () => (id: number | null) => ({ connectionId: id, config: null, missing: id === 42 }),
        tablesFor: () => () => [],
        "connectionTree/connection": () => () => ({ status: "idle", databaseEntities: {}, inaccessibleDatabases: [] }),
      },
      actions: {
        "connectionTree/open": dispatch,
        "connectionTree/loadDatabase": dispatch,
        loadDatabaseEntities: dispatch,
      },
    });
    const wrapper = mount(TabWithTable, {
      localVue,
      store,
      propsData: { tab: { id: 3, tabType: "table", tableName: "users", targetConnectionId: 42, databaseName: "shop" }, active: true },
    });
    await Vue.nextTick();

    expect(wrapper.text()).toContain("Saved connection not found");
    expect(dispatch).not.toHaveBeenCalled();
    expect(send.mock.calls.filter(([name]) => String(name).startsWith("conn/"))).toEqual([]);
  });
});
