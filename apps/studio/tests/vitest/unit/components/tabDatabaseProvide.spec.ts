import { describe, it, expect } from "vitest";
import { createLocalVue, mount } from "@vue/test-utils";
import Vuex from "vuex";
import TableTable from "@/components/tableview/TableTable.vue";
import TabTableProperties from "@/components/TabTableProperties.vue";
import TabQueryEditor from "@/components/TabQueryEditor.vue";
import { TabDatabaseMixin } from "@/mixins/TabDatabase";
import { ElectronUtilityConnectionClient } from "@/lib/utility/ElectronUtilityConnectionClient";
import { connectionForTab } from "@/lib/utility/tabConnection";

// The tab components hand their database to every child through provide /
// TabDatabaseMixin (TableSchema, TableIndexes, TableRelations, ResultTable,
// RowFilterBuilder, TableLength...). Each case runs a tab's real `provide`
// above a child built on the real mixin.
const localVue = createLocalVue();
localVue.use(Vuex);

const defaultConnection = new ElectronUtilityConnectionClient();

function store() {
  return new Vuex.Store({
    state: { database: "a", connection: defaultConnection },
    getters: {
      connectionFor: (state: any) => (db: string | null) => connectionForTab(state.connection, { databaseName: db }, state.database),
    },
  });
}

const Child = { name: "TabChild", mixins: [TabDatabaseMixin], render: (h) => h("div") };

function childUnder(tabComponent: any, tab: any) {
  const provide = (tabComponent.options ?? tabComponent).provide;
  const Parent = {
    data: () => ({ tab }),
    provide,
    render(h) { return h(Child); },
  };
  return mount(Parent, { localVue, store: store() }).findComponent(Child).vm as any;
}

describe("tabs hand their database to child components", () => {
  for (const [name, component] of [
    ["TableTable", TableTable],
    ["TabTableProperties", TabTableProperties],
    ["TabQueryEditor", TabQueryEditor],
  ] as const) {
    it(`${name} children run on the tab database`, () => {
      const child = childUnder(component, { id: 1, databaseName: "b" });
      expect(child.database).toBe("b");
      expect(child.connection).not.toBe(defaultConnection);
      expect(child.connection.database).toBe("b");

      // a tab on the default database keeps the default connection
      const onDefault = childUnder(component, { id: 2, databaseName: null });
      expect(onDefault.database).toBe("a");
      expect(onDefault.connection).toBe(defaultConnection);
    });
  }
});
