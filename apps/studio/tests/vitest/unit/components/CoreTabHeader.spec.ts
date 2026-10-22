import { describe, it, expect, vi } from "vitest";
import { createLocalVue, mount } from "@vue/test-utils";
import Vuex from "vuex";
import CoreTabHeader from "@/components/CoreTabHeader.vue";

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.directive("hotkey", {});

function mountHeader(tab: any, defaultDatabase = "a", colors: Record<string, string> = {}) {
  const store = new Vuex.Store({
    state: { database: defaultDatabase },
    getters: { minimalMode: () => false, dialectData: () => ({ disabledFeatures: {} }) },
    modules: {
      tabs: { namespaced: true, state: { active: null } },
      databaseLabels: { namespaced: true, getters: { colorFor: () => (db: string) => colors[db] ?? null } },
    },
  });
  return mount(CoreTabHeader, {
    localVue,
    store,
    propsData: { tab, tabsCount: 1, selected: false },
    stubs: { TabIcon: true },
    mocks: { $vHotkeyKeymap: () => ({}), $bks: { openMenu: vi.fn() } },
  });
}

describe("CoreTabHeader", () => {
  it("query tab header shows its database", () => {
    const bound = mountHeader({ id: 1, tabType: "query", title: "Query #1", databaseName: "b" });
    expect(bound.find(".tab-database").text()).toBe("b");

    const onDefault = mountHeader({ id: 2, tabType: "query", title: "Query #2", databaseName: "a" });
    expect(onDefault.find(".tab-database").text()).toBe("a");
  });

  it("tab shows its database color", () => {
    const colors = { a: "green", b: "purple" };
    const onB = mountHeader({ id: 3, tabType: "table", title: "orders", databaseName: "b" }, "a", colors);
    expect(onB.find(".tab-color-stripe").classes()).toContain("connection-label-color-purple");
    expect(onB.find(".tab-database").classes()).toContain("connection-label-color-purple");

    const onDefault = mountHeader({ id: 4, tabType: "query", title: "Query #3", databaseName: null }, "a", colors);
    expect(onDefault.find(".tab-color-stripe").classes()).toContain("connection-label-color-green");
    expect(onDefault.find(".tab-database").classes()).toContain("connection-label-color-green");

    const uncolored = mountHeader({ id: 5, tabType: "query", title: "Query #4", databaseName: "c" }, "a", colors);
    expect(uncolored.find(".tab-color-stripe").exists()).toBe(false);
  });

  it("secondary connection name and color in the tab header", () => {
    const contexts = {
      7: { config: { name: "shop-mysql", labelColor: "blue" }, database: "shop", dialectData: { disabledFeatures: {} } },
    };
    const store = new Vuex.Store({
      state: { database: "a" },
      getters: {
        minimalMode: () => false,
        dialectData: () => ({ disabledFeatures: {} }),
        connectionContext: () => (id: number) => contexts[id],
      },
      modules: {
        tabs: { namespaced: true, state: { active: null } },
        databaseLabels: { namespaced: true, getters: { colorFor: () => () => "green" } },
      },
    });
    const mountWith = (tab: any) => mount(CoreTabHeader, {
      localVue,
      store,
      propsData: { tab, tabsCount: 1, selected: false },
      stubs: { TabIcon: true },
      mocks: { $vHotkeyKeymap: () => ({}), $bks: { openMenu: vi.fn() } },
    });

    const onC = mountWith({ id: 6, tabType: "table", title: "users", targetConnectionId: 7, databaseName: "shop" });
    expect(onC.find(".tab-connection").text()).toBe("shop-mysql");
    expect(onC.find(".tab-database").text()).toBe("shop");
    expect(onC.find(".tab-color-stripe").classes()).toContain("connection-label-color-blue");

    // a tab on the window's connection is unchanged: no connection name, the database color
    const onWindow = mountWith({ id: 7, tabType: "table", title: "users", targetConnectionId: null, databaseName: "b" });
    expect(onWindow.find(".tab-connection").exists()).toBe(false);
    expect(onWindow.find(".tab-color-stripe").classes()).toContain("connection-label-color-green");
  });
});
