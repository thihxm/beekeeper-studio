import { describe, it, expect, vi } from "vitest";
import { createLocalVue, mount } from "@vue/test-utils";
import Vuex from "vuex";
import { AppEventMixin, AppEvent } from "@/common/AppEvent";
import DatabaseColorModal from "@/components/sidebar/core/DatabaseColorModal.vue";
import VirtualTableList from "@/components/sidebar/core/table_list/VirtualTableList.vue";
import CoreInterface from "@/components/CoreInterface.vue";

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.mixin(AppEventMixin);

describe("setting a database color from the tree", () => {
  it("the database menu opens the color modal for that database", () => {
    const options = (VirtualTableList as any).options ?? VirtualTableList;
    const trigger = vi.fn();
    const menu = options.computed.databaseMenuOptions.call({ trigger });
    const setColor = menu.find((o) => o.slug === "database-color");

    expect(setColor.name).toBe("Set color");
    setColor.handler({ item: "b" });
    expect(trigger).toHaveBeenCalledWith(AppEvent.openDatabaseColorModal, "b");
  });

  it("the color modal saves the picked color for its database", async () => {
    const setColor = vi.fn();
    const store = new Vuex.Store({
      modules: {
        databaseLabels: {
          namespaced: true,
          getters: { colorFor: () => (db: string) => (db === "b" ? "red" : null) },
          actions: { setColor },
        },
      },
    });
    const show = vi.fn();
    const wrapper = mount(DatabaseColorModal, {
      localVue,
      store,
      stubs: { BaseModal: { template: "<div><slot /></div>" }, ColorPicker: true },
      mocks: { $modal: { show } },
    });
    const vm = wrapper.vm as any;

    // opened through the event the tree menu triggers
    vm.$root.$emit(AppEvent.openDatabaseColorModal, "b");
    expect(show).toHaveBeenCalledWith(vm.modalName);
    expect(vm.database).toBe("b");
    expect(vm.color).toBe("red");

    vm.color = "purple";
    const close = vi.fn();
    await vm.save(new Event("submit"), close);

    expect(setColor).toHaveBeenCalledTimes(1);
    expect(setColor.mock.calls[0][1]).toEqual({ databaseName: "b", color: "purple" });
    expect(close).toHaveBeenCalled();
  });
});

describe("connecting", () => {
  it("loads the colors of the connection", async () => {
    const options = (CoreInterface as any).options ?? CoreInterface;
    const dispatch = vi.fn(async () => undefined);
    await options.watch.usedConfig.handler.call({ usedConfig: { id: 3 }, $store: { dispatch } });

    expect(dispatch).toHaveBeenCalledWith("databaseLabels/load");
  });
});
