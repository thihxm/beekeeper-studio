import { describe, it, expect } from "vitest";
import { createLocalVue, mount } from "@vue/test-utils";
import Vue from "vue";
import Vuex from "vuex";
import PortalVue from "portal-vue";
import appStore from "@/store";
import StatusBar from "@/components/common/StatusBar.vue";

const root = (appStore as any)._modules.root._rawModule;

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(PortalVue);

const saved = {
  7: { id: 7, name: "shop-mysql", labelColor: "blue" },
  9: { id: 9, name: "reports", labelColor: "default" },
};

/** the app's own color getters over a window connection colored red */
function makeStore(active: any) {
  return new Vuex.Store({
    state: { usedConfig: { id: 3, labelColor: "red" } },
    getters: {
      connectionColor: root.getters.connectionColor,
      activeConnectionColor: root.getters.activeConnectionColor,
    },
    modules: {
      tabs: { namespaced: true, state: { active }, mutations: { active: (state: any, tab: any) => (state.active = tab) } },
      connectionTree: {
        namespaced: true,
        getters: { context: () => (id: number) => ({ config: saved[id] ?? null }) },
      },
    },
  });
}

function mountBar(store: any) {
  return mount({
    components: { StatusBar },
    template: `<div><status-bar :active="true">bar</status-bar><portal-target name="global-status-bar" /></div>`,
  }, { localVue, store });
}

const footerClasses = (wrapper: any) => wrapper.find("footer").classes();

describe("status bar color", () => {
  it("status bar color follows the active tab connection", async () => {
    for (const [active, expected, absent] of [
      [{ id: 1, targetConnectionId: 7 }, "blue", "red"],
      [{ id: 2, targetConnectionId: null }, "red", "blue"],
      [null, "red", "blue"],
      [{ id: 3, targetConnectionId: 9 }, "default", "red"],
    ] as const) {
      const wrapper = mountBar(makeStore(active));
      await Vue.nextTick();
      expect(footerClasses(wrapper)).toContain(expected);
      expect(footerClasses(wrapper)).not.toContain(absent);
      wrapper.destroy();
    }
  });

  it("status bar color changes with the active tab", async () => {
    const store = makeStore({ id: 1, targetConnectionId: 7 });
    const wrapper = mountBar(store);
    await Vue.nextTick();
    expect(footerClasses(wrapper)).toContain("blue");

    store.commit("tabs/active", { id: 2, targetConnectionId: null });
    await Vue.nextTick();
    await Vue.nextTick();

    expect(footerClasses(wrapper)).toContain("red");
    expect(footerClasses(wrapper)).not.toContain("blue");
  });
});
