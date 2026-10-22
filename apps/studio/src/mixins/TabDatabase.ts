import Vue from "vue";
import { ConnectionContext } from "@/store";

/** `connectionContext` of the store, or the window's state where a store has no such getter */
function contextOf(store: any, targetConnectionId: number | null): ConnectionContext {
  if (store.getters.connectionContext) return store.getters.connectionContext(targetConnectionId);
  return {
    connectionId: null,
    config: store.state.usedConfig,
    connectionType: store.state.connectionType,
    dialect: store.getters.dialect,
    dialectData: store.getters.dialectData,
    supportedFeatures: store.state.supportedFeatures,
    defaultSchema: store.state.defaultSchema,
    database: store.state.database,
    databaseList: store.state.databaseList,
    missing: false,
  };
}

/**
 * Reads that depend on the connection a tab runs on: the window's, or a saved
 * connection opened from the entity tree (`connectionContext`).
 */
const connectionReads = {
  dialect() {
    return (this.connectionContext as ConnectionContext).dialect;
  },
  dialectData() {
    return (this.connectionContext as ConnectionContext).dialectData;
  },
  connectionType() {
    return (this.connectionContext as ConnectionContext).connectionType;
  },
  supportedFeatures() {
    return (this.connectionContext as ConnectionContext).supportedFeatures;
  },
  defaultSchema() {
    return (this.connectionContext as ConnectionContext).defaultSchema;
  },
  /** the saved config of the connection the tab runs on (read-only mode, id...) */
  usedConfig() {
    return (this.connectionContext as ConnectionContext).config;
  },
  databaseList() {
    return (this.connectionContext as ConnectionContext).databaseList;
  },
};

/**
 * For components rendered inside a tab: `connection` and `database` follow the
 * database of the tab that provides `tabDatabase`, and fall back to the
 * connection's default database outside a tab. The dialect, features and config
 * follow the connection of the tab that provides `tabConnectionId`.
 */
export const TabDatabaseMixin = Vue.extend({
  inject: {
    tabDatabase: { default: () => () => null },
    tabConnectionId: { default: () => () => null },
  },
  computed: {
    connectionContext(): ConnectionContext {
      return contextOf(this.$store, this.tabConnectionId());
    },
    connection() {
      return this.$store.getters.connectionFor(this.tabDatabase(), this.tabConnectionId());
    },
    database(): string | null {
      return this.tabDatabase() ?? this.connectionContext.database;
    },
    ...connectionReads,
  },
});

/** For the tab components themselves (query, table, structure): reads follow `this.tab` */
export const TabConnectionMixin = Vue.extend({
  computed: {
    connectionContext(): ConnectionContext {
      return contextOf(this.$store, this.tab?.targetConnectionId ?? null);
    },
    ...connectionReads,
  },
});
