import { describe, it, expect, vi } from "vitest";
import { createLocalVue, mount } from "@vue/test-utils";
import Vuex from "vuex";
import CoreTabHeader from "@/components/CoreTabHeader.vue";

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.directive("hotkey", {});

function mountHeader(tab: any, defaultDatabase = "a") {
  const store = new Vuex.Store({
    state: { database: defaultDatabase },
    getters: { minimalMode: () => false, dialectData: () => ({ disabledFeatures: {} }) },
    modules: { tabs: { namespaced: true, state: { active: null } } },
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
});
