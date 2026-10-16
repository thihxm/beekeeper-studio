import { describe, it, expect, vi } from "vitest";
import { createLocalVue, mount, shallowMount } from "@vue/test-utils";
import Vuex from "vuex";
import { AppEventMixin, AppEvent } from "@/common/AppEvent";
import DatabaseColorModal from "@/components/sidebar/core/DatabaseColorModal.vue";
import VirtualTableList from "@/components/sidebar/core/table_list/VirtualTableList.vue";
import CoreInterface from "@/components/CoreInterface.vue";
import TableList from "@/components/sidebar/core/TableList.vue";

// TableList splits its panes with split.js, which needs a real layout
vi.mock("split.js", () => ({ default: () => ({ destroy: vi.fn(), setSizes: vi.fn() }) }));

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

  // BaseModal wraps a form and emits `submit` with a close callback; this stand-in
  // keeps exactly that contract so pressing Save goes through @submit
  const FormModal = {
    template: '<form class="color-form" @submit.prevent="$emit(\'submit\', $event, () => $emit(\'closed\'))"><slot /><slot name="footer" :close="() => {}" /></form>',
  };

  function mountModal(currentColor: string | null) {
    const setColor = vi.fn();
    const store = new Vuex.Store({
      modules: {
        databaseLabels: {
          namespaced: true,
          getters: { colorFor: () => (db: string) => (db === "b" ? currentColor : null) },
          actions: { setColor },
        },
      },
    });
    const show = vi.fn();
    const wrapper = mount(DatabaseColorModal, {
      localVue,
      store,
      stubs: { BaseModal: FormModal, ColorPicker: true },
      mocks: { $modal: { show } },
    });
    return { wrapper, vm: wrapper.vm as any, setColor, show };
  }

  it("the color modal saves the picked color for its database", async () => {
    const { wrapper, vm, setColor, show } = mountModal("red");

    // opened through the event the tree menu triggers
    vm.$root.$emit(AppEvent.openDatabaseColorModal, "b");
    expect(show).toHaveBeenCalledWith(vm.modalName);
    expect(vm.database).toBe("b");
    expect(vm.color).toBe("red");

    vm.color = "purple";
    await wrapper.find("form.color-form").trigger("submit");

    expect(setColor).toHaveBeenCalledTimes(1);
    expect(setColor.mock.calls[0][1]).toEqual({ databaseName: "b", color: "purple" });
  });

  it("the color modal removes the color with default", async () => {
    const { wrapper, vm, setColor } = mountModal("red");
    vm.$root.$emit(AppEvent.openDatabaseColorModal, "b");

    vm.color = "default";
    await wrapper.find("form.color-form").trigger("submit");

    expect(setColor.mock.calls[0][1]).toEqual({ databaseName: "b", color: "default" });
  });

  it("the entity tree mounts the color modal", () => {
    const store = new Vuex.Store({
      state: {
        tables: [], routines: [], database: "a", tablesLoading: null, supportedFeatures: {},
        connectionType: "postgresql", selectedSidebarItem: null, usedConfig: { readOnlyMode: false },
        entityFilter: { filterQuery: undefined, showTables: true, showViews: true, showRoutines: true },
      },
      getters: {
        filteredTables: () => [], filteredRoutines: () => [], dialectData: () => ({ disabledFeatures: {} }),
        dialect: () => "postgresql",
        "pins/pinnedEntities": () => [], "pins/orderedPins": () => [],
        "hideEntities/totalEntities": () => 0, "hideEntities/databaseEntities": () => [], "hideEntities/databaseSchemas": () => [],
      },
    });
    (window as any).platformInfo = { ...(window as any).platformInfo, isDevelopment: false };
    const wrapper = shallowMount(TableList, {
      localVue,
      store,
      stubs: { portal: { template: "<div><slot /></div>" } },
      mocks: { $bksConfig: { ui: { tableList: { itemHeight: 20 } } } },
    });

    expect(wrapper.findComponent(DatabaseColorModal).exists()).toBe(true);
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
