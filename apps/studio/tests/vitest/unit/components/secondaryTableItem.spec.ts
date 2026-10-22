import { describe, it, expect, vi } from "vitest";
import { createLocalVue, mount } from "@vue/test-utils";
import Vuex from "vuex";
import Item from "@/components/sidebar/core/table_list/Item.vue";

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.config.ignoredElements = [/^x-/];

const users = { name: "users", schema: "public", entityType: "table", columns: [] };

function mountItem(source: any, activeTab: any = null) {
  const store = new Vuex.Store({
    state: { activeTab, database: "app" },
    getters: { selectedSidebarItem: () => null },
    mutations: { selectSidebarItem: () => undefined },
  });
  const wrapper = mount(Item, {
    localVue,
    store,
    propsData: { source, onExpand: vi.fn(), onPin: vi.fn(), onRetry: vi.fn(), lockedTitle: () => "", isOpen: () => false },
    stubs: { TableIcon: true },
  });
  const emitted = vi.spyOn(wrapper.vm.$root, "$emit");
  return { wrapper, emitted };
}

const secondaryTable = { type: "table", key: "connection::7::app::public.users", entity: users, database: "app", connectionId: 7, level: 2, pinned: false };
const windowTable = { ...secondaryTable, key: "app::public.users", connectionId: null };

describe("a table under a secondary connection", () => {
  it("double click opens the table on its saved connection", async () => {
    const { wrapper, emitted } = mountItem(secondaryTable);

    await wrapper.find(".item-wrapper").trigger("dblclick");

    expect(emitted).toHaveBeenCalledWith("loadTable", { table: users, database: "app", connectionId: 7 });
  });

  it("double click on a window table opens it on the window connection", async () => {
    const { wrapper, emitted } = mountItem(windowTable);

    await wrapper.find(".item-wrapper").trigger("dblclick");

    expect(emitted).toHaveBeenCalledWith("loadTable", { table: users, database: "app", connectionId: null });
  });

  it("secondary table and routine rows have no pin action", () => {
    expect(mountItem(secondaryTable).wrapper.find(".pin").exists()).toBe(false);
    expect(mountItem(windowTable).wrapper.find(".pin").exists()).toBe(true);

    const routine = { type: "routine", key: "connection::7::app::public.f", entity: { name: "f", schema: "public", type: "function", routineParams: [] }, connectionId: 7, level: 2, pinned: false };
    expect(mountItem(routine).wrapper.find(".pin").exists()).toBe(false);
    expect(mountItem({ ...routine, connectionId: null }).wrapper.find(".pin").exists()).toBe(true);
  });

  it("active highlight follows the connection of the active tab", () => {
    const windowTab = { table: users, databaseName: "app", targetConnectionId: null };
    const secondaryTab = { table: users, databaseName: "app", targetConnectionId: 7 };
    const isActive = (source: any, tab: any) => mountItem(source, tab).wrapper.find(".list-item-btn").classes().includes("active");

    expect(isActive(secondaryTable, windowTab)).toBe(false);
    expect(isActive(windowTable, secondaryTab)).toBe(false);
    expect(isActive(secondaryTable, secondaryTab)).toBe(true);
    expect(isActive(windowTable, windowTab)).toBe(true);
  });
});
