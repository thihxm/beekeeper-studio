import { Module, Store } from "vuex";
import Vue from "vue";
import _ from "lodash";
import { State as RootState, DatabaseEntities, resolveEphemeralValues } from "../index";
import { IConnection } from "@/common/interfaces/IConnection";
import { LocalWorkspace } from "@/common/interfaces/IWorkspace";
import { childSessionKey } from "@/common/connectionSession";
import { ConnectionSession, ElectronUtilityConnectionClient } from "@/lib/utility/ElectronUtilityConnectionClient";
import { SupportedFeatures, TableOrView, Routine } from "@/lib/db/models";
import { DATABASE_ACCESS_DENIED } from "@/lib/db/accessDenied";
import rawLog from "@bksLogger";

const log = rawLog.scope("ConnectionTreeModule");

export type ConnectionTreeScope = "off" | "pinned" | "all";

/** A saved connection opened from the entity tree, next to the window's own */
export interface SecondaryConnection {
  status: "idle" | "connecting" | "connected" | "error",
  error?: string,
  connectionType?: string,
  supportedFeatures?: SupportedFeatures,
  defaultSchema?: string,
  /** the connection's default database */
  database?: string | null,
  databaseList: string[],
  /** keyed by database name, the default database included */
  databaseEntities: Record<string, DatabaseEntities>,
  inaccessibleDatabases: string[],
  /** the config it connected with, ephemeral values resolved */
  config?: IConnection,
}

interface State {
  /** every saved connection of the window's workspace */
  savedConnections: IConnection[],
  connections: Record<number, SecondaryConnection>,
  /** tabs with an open transaction or reserved connection, and the saved connection each runs on */
  busyTabs: Record<number, number>,
}

const emptyConnection = (): SecondaryConnection => ({
  status: "idle",
  databaseList: [],
  databaseEntities: {},
  inaccessibleDatabases: [],
});

// connects in flight, so two expands of one node connect once
const pending = new Map<number, Promise<boolean>>();
let dispatchOpen: (id: number) => Promise<boolean> = async () => false;

/** Gives the clients the module hands out a way to connect on first use */
export function connectionTreePlugin(store: Store<RootState>) {
  dispatchOpen = (id: number) => store.dispatch("connectionTree/open", id);
}

function sessionFor(id: number, open = true): ConnectionSession {
  const session: ConnectionSession = { sId: childSessionKey(Vue.prototype.$util.sId, id) };
  if (open) {
    session.open = async () => {
      if (!(await dispatchOpen(id))) throw new Error("The saved connection is not connected");
    };
  }
  return session;
}

/** A client on secondary connection `id`; `open` connects it on first use */
export function secondaryClient(id: number, open = true): ElectronUtilityConnectionClient {
  return new ElectronUtilityConnectionClient().forConnection(sessionFor(id, open));
}

function typed(tables: TableOrView[], entityType: TableOrView["entityType"]) {
  for (const t of tables) t.entityType = entityType;
  return tables;
}

export const ConnectionTreeModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    savedConnections: [],
    connections: {},
    busyTabs: {},
  }),
  getters: {
    scope(_state, _getters, _rootState, rootGetters): ConnectionTreeScope {
      const value = rootGetters["settings/settings"]?.connectionTreeScope?.value;
      return ["off", "pinned", "all"].includes(value) ? value : "pinned";
    },
    /** the saved connections the tree lists after the window's own */
    listed(state, getters, rootState): IConnection[] {
      const own = rootState.usedConfig?.id;
      const others = state.savedConnections.filter((c) => c.id && c.id !== own);
      if (getters.scope === "off") return [];
      if (getters.scope === "all") return _.sortBy(others, (c) => (c.name ?? "").toLowerCase());
      const pins = _.sortBy(rootState["pinnedConnections"].pins, "position");
      return pins
        .map((pin) => others.find((c) => c.id === pin.connectionId))
        .filter((c) => !!c);
    },
    connection(state) {
      return (id: number): SecondaryConnection => state.connections[id] ?? emptyConnection();
    },
    savedConnection(state) {
      return (id: number): IConnection | undefined => state.savedConnections.find((c) => c.id === id);
    },
    /** The client for `database` of secondary connection `id`; its default database for null */
    clientFor(state) {
      return (id: number, database?: string | null): ElectronUtilityConnectionClient => {
        const client = secondaryClient(id);
        const node = state.connections[id];
        if (database == null || database === node?.database) return client;
        return client.forDatabase(database);
      };
    },
    tablesFor(state) {
      return (id: number, database?: string | null): TableOrView[] => {
        const node = state.connections[id];
        return node?.databaseEntities[database ?? node?.database]?.tables ?? [];
      };
    },
    routinesFor(state) {
      return (id: number, database?: string | null): Routine[] => {
        const node = state.connections[id];
        return node?.databaseEntities[database ?? node?.database]?.routines ?? [];
      };
    },
  },
  mutations: {
    savedConnections(state, connections: IConnection[]) {
      state.savedConnections = connections;
    },
    update(state, { id, changes }: { id: number, changes: Partial<SecondaryConnection> }) {
      // a new object every time, so watchers of the whole record are notified
      state.connections = { ...state.connections, [id]: { ...(state.connections[id] ?? emptyConnection()), ...changes } };
    },
    databaseEntities(state, { id, database, entities }: { id: number, database: string, entities: DatabaseEntities }) {
      const node = state.connections[id] ?? emptyConnection();
      const databaseEntities = { ...node.databaseEntities, [database]: entities };
      state.connections = { ...state.connections, [id]: { ...node, databaseEntities } };
    },
    tabBusy(state, { tabId, connectionId, busy }: { tabId: number, connectionId: number | null, busy: boolean }) {
      state.busyTabs = busy && connectionId != null ?
        { ...state.busyTabs, [tabId]: connectionId } :
        _.omit(state.busyTabs, tabId);
    },
    remove(state, id: number) {
      state.connections = _.omit(state.connections, id);
    },
    clear(state) {
      state.connections = {};
    },
  },
  actions: {
    /** Every saved connection of the workspace, whatever the connection sidebar has loaded */
    async loadSaved(context) {
      const workspaceId = context.rootState.workspaceId;
      try {
        const connections: IConnection[] = workspaceId === LocalWorkspace.id ?
          await Vue.prototype.$util.send("appdb/saved/find", { options: { where: { workspaceId } } }) :
          await context.rootGetters.cloudClient?.connections.list();
        context.commit("savedConnections", connections ?? []);
      } catch (e) {
        log.error("Loading the saved connections failed", e);
        context.commit("savedConnections", []);
      }
    },
    /** Connects saved connection `id` in its own session; true once it is connected */
    async open(context, id: number): Promise<boolean> {
      if (context.state.connections[id]?.status === "connected") return true;
      if (pending.has(id)) return await pending.get(id);
      const opening = context.dispatch("connect", id);
      pending.set(id, opening);
      try {
        return await opening;
      } finally {
        pending.delete(id);
      }
    },
    async connect(context, id: number): Promise<boolean> {
      const saved: IConnection = context.getters.savedConnection(id);
      if (!saved) {
        context.commit("update", { id, changes: { status: "error", error: "Saved connection not found" } });
        return false;
      }
      context.commit("update", { id, changes: { ...emptyConnection(), status: "connecting" } });
      const config = await resolveEphemeralValues(saved);
      if (!config) {
        // the prompt was cancelled
        context.commit("update", { id, changes: { status: "idle" } });
        return false;
      }
      const session = sessionFor(id, false);
      try {
        await Vue.prototype.$util.send("conn/create", { config, osUser: context.rootState.username, sId: session.sId });
        const client = new ElectronUtilityConnectionClient().forConnection(session);
        const supportedFeatures = await client.supportedFeatures();
        const defaultSchema = await client.defaultSchema();
        const databaseList = await client.listDatabases();
        let inaccessibleDatabases: string[] = [];
        try {
          inaccessibleDatabases = await client.listInaccessibleDatabases();
        } catch (e) {
          log.warn("Could not list inaccessible databases", e);
        }
        context.commit("update", {
          id,
          changes: {
            status: "connected",
            error: undefined,
            config,
            connectionType: config.connectionType,
            supportedFeatures,
            defaultSchema,
            database: config.defaultDatabase || null,
            databaseList: databaseList ?? [],
            inaccessibleDatabases: inaccessibleDatabases ?? [],
          },
        });
      } catch (e) {
        log.error(`Connecting saved connection ${id} failed`, e);
        context.commit("update", { id, changes: { status: "error", error: e.message } });
        return false;
      }
      await context.dispatch("loadDatabase", { id, database: config.defaultDatabase || null });
      return true;
    },
    /** Loads tables, views and routines of one database of secondary connection `id` */
    async loadDatabase(context, { id, database, force = false }: { id: number, database: string | null, force?: boolean }) {
      const node = context.state.connections[id];
      if (node?.status !== "connected") return;
      const key = database ?? node.database;
      const current = node.databaseEntities[key];
      if (!force && (current?.status === "loading" || current?.status === "loaded")) return;

      context.commit("databaseEntities", { id, database: key, entities: { tables: [], routines: [], status: "loading" } });
      const client = new ElectronUtilityConnectionClient().forConnection(sessionFor(id, false));
      const connection = database == null || database === node.database ? client : client.forDatabase(database);
      try {
        const [tables, views, materialized] = await Promise.all([
          connection.listTables(null),
          connection.listViews(null),
          connection.listMaterializedViews(null),
        ]);
        const entities = typed(tables, "table").concat(typed(views, "view")).concat(typed(materialized, "materialized-view"));
        for (const t of entities) t.columns ||= [];
        let routines: Routine[] = [];
        try {
          routines = await connection.listRoutines(null);
          for (const r of routines) r.entityType = "routine";
        } catch (e) {
          log.error(`Loading routines of ${key} on saved connection ${id} failed`, e);
        }
        context.commit("databaseEntities", { id, database: key, entities: { tables: entities, routines: Object.freeze(routines) as Routine[], status: "loaded" } });
      } catch (e) {
        log.error(`Loading ${key} on saved connection ${id} failed`, e);
        if (e?.code === DATABASE_ACCESS_DENIED) {
          context.commit("update", { id, changes: { inaccessibleDatabases: _.uniq([...context.state.connections[id].inaccessibleDatabases, key]) } });
        }
        context.commit("databaseEntities", { id, database: key, entities: { tables: [], routines: [], status: "error", error: e.message } });
      }
    },
    /** Lists the databases again and reloads the loaded ones */
    async refresh(context, id: number) {
      const node = context.state.connections[id];
      if (node?.status !== "connected") return;
      const client = new ElectronUtilityConnectionClient().forConnection(sessionFor(id, false));
      context.commit("update", { id, changes: { databaseList: await client.listDatabases() } });
      const loaded = Object.entries(node.databaseEntities).filter(([, e]) => e.status === "loaded").map(([name]) => name);
      for (const database of loaded) {
        await context.dispatch("loadDatabase", { id, database: database === node.database ? null : database, force: true });
      }
    },
    /** Closes secondary connection `id`; tabs bound to it reconnect on their next call */
    async disconnect(context, id: number) {
      const { sId } = sessionFor(id, false);
      try {
        await Vue.prototype.$util.send("conn/disconnect", { sId });
        await Vue.prototype.$util.send("conn/clearConnection", { sId });
      } catch (e) {
        log.error(`Disconnecting saved connection ${id} failed`, e);
      }
      context.commit("remove", id);
    },
    /** Closes every secondary connection, before the window's own goes */
    async disconnectAll(context) {
      const open = Object.entries(context.state.connections)
        .filter(([, c]) => c.status === "connected" || c.status === "connecting")
        .map(([id]) => Number(id));
      for (const id of open) await context.dispatch("disconnect", id);
      context.commit("clear");
    },
  },
};
