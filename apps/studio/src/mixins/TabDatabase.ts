import Vue from "vue";

/**
 * For components rendered inside a tab: `connection` and `database` follow the
 * database of the tab that provides `tabDatabase`, and fall back to the
 * connection's default database outside a tab.
 */
export const TabDatabaseMixin = Vue.extend({
  inject: {
    tabDatabase: { default: () => () => null },
  },
  computed: {
    connection() {
      return this.$store.getters.connectionFor(this.tabDatabase());
    },
    database(): string | null {
      return this.tabDatabase() ?? this.$store.state.database;
    },
  },
});
