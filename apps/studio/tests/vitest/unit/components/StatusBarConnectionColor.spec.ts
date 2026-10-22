import { describe, it, expect } from "vitest";
import { createLocalVue, mount } from "@vue/test-utils";
import Vue from "vue";
import Vuex from "vuex";
import PortalVue from "portal-vue";
import appStore from "@/store";
import StatusBar from "@/components/common/StatusBar.vue";
import ConnectionButton from "@/components/sidebar/core/ConnectionButton.vue";

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
    state: { usedConfig: { id: 3, name: "app", connectionType: "mysql", labelColor: "red" }, connection: {}, versionString: "8" },
    getters: {
      connectionColor: root.getters.connectionColor,
      activeConnectionColor: root.getters.activeConnectionColor,
      // what the connection segment of the bar reads besides its color
      "exports/hasRunningExports": () => false,
      workspace: () => ({ id: -1 }),
      "data/connections/filteredConnections": () => [],
      "settings/privacyMode": () => false,
    },
    modules: {
      "data/connections": { namespaced: true, state: { items: [] } },
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

/** the connection name and dialect segment on the left of the bar */
function mountConnectionSegment(store: any) {
  return mount(ConnectionButton, {
    localVue,
    store,
    stubs: { portal: true, SaveConnectionForm: true },
    mocks: { $bks: { buildConnectionString: () => "", buildConnectionName: (c: any) => c.name } },
  });
}

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

  it("the connection segment takes the same color as the rest of the bar", async () => {
    for (const [active, expected, absent] of [
      [{ id: 1, targetConnectionId: 7 }, "blue", "red"],
      [{ id: 2, targetConnectionId: null }, "red", "blue"],
      [null, "red", "blue"],
      [{ id: 3, targetConnectionId: 9 }, "default", "red"],
    ] as const) {
      const store = makeStore(active);
      const bar = mountBar(store);
      const segment = mountConnectionSegment(store);
      await Vue.nextTick();
      expect(segment.classes()).toContain(expected);
      expect(segment.classes()).not.toContain(absent);
      expect(footerClasses(bar)).toContain(expected);
      bar.destroy();
      segment.destroy();
    }
  });

  it("the connection segment color changes with the active tab", async () => {
    const store = makeStore({ id: 1, targetConnectionId: 7 });
    const segment = mountConnectionSegment(store);
    expect(segment.classes()).toContain("blue");

    store.commit("tabs/active", { id: 2, targetConnectionId: null });
    await Vue.nextTick();

    expect(segment.classes()).toContain("red");
    expect(segment.classes()).not.toContain("blue");
  });
});
