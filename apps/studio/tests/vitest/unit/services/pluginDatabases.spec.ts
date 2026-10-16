import { describe, it, expect, vi, beforeEach } from "vitest";
import Vue from "vue";
import PluginStoreService from "@/services/plugin/web/PluginStoreService";
import WebPluginLoader from "@/services/plugin/web/WebPluginLoader";
import { ElectronUtilityConnectionClient } from "@/lib/utility/ElectronUtilityConnectionClient";
import { connectionForTab } from "@/lib/utility/tabConnection";

const ordersB = { name: "orders", schema: "public", entityType: "table" };
const ordersA = { name: "orders", schema: "public", entityType: "table", columns: [{ columnName: "a_only" }] };

let send: ReturnType<typeof vi.fn>;

/** A stand-in for the root Vuex store with just what the plugin service reads */
function fakeStore(overrides: Record<string, any> = {}, multipleDatabasesDisabled = false) {
  const state: any = {
    usedConfig: { id: 3, name: "Prod", readOnlyMode: false },
    workspaceId: -1,
    connectionType: "postgresql",
    database: "a",
    defaultSchema: "public",
    databaseList: ["a", "b", "c"],
    inaccessibleDatabases: ["b"],
    tables: [ordersA],
    databaseEntities: { b: { status: "loaded", tables: [ordersB], routines: [] } },
    connection: new ElectronUtilityConnectionClient(),
    ...overrides,
  };
  const colors: Record<string, string> = { c: "purple" };
  const getters: any = {
    dialectData: { disabledFeatures: multipleDatabasesDisabled ? { multipleDatabases: true } : {} },
    "databaseLabels/colorFor": (db: string) => colors[db] ?? null,
    tablesFor: (db: string | null) => (db == null || db === state.database ? state.tables : state.databaseEntities[db]?.tables ?? []),
    connectionFor: (db: string | null) => connectionForTab(state.connection, { databaseName: db }, state.database),
  };
  return { state, getters, subscribe: () => undefined } as any;
}

const bus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };

beforeEach(() => {
  send = vi.fn(async () => [{ fields: [], rows: [], rowCount: 0, affectedRows: 0 }]);
  Vue.prototype.$util = { send };
});

describe("plugin API and databases", () => {
  it("getDatabases lists every database", () => {
    const service = new PluginStoreService(fakeStore(), bus);
    expect(service.getDatabases()).toEqual([
      { name: "a", isDefault: true, accessible: true, color: null },
      { name: "b", isDefault: false, accessible: false, color: null },
      { name: "c", isDefault: false, accessible: true, color: "purple" },
    ]);
  });

  it("getDatabases is empty without multiple databases", () => {
    const service = new PluginStoreService(fakeStore({}, true), bus);
    expect(service.getDatabases()).toEqual([]);
  });

  it("getDatabases rejects when disconnected", () => {
    const service = new PluginStoreService(fakeStore({ usedConfig: null }), bus);
    expect(() => service.getDatabases()).toThrow("No database connection found");
  });

  it("runQuery runs on the given database", async () => {
    const service = new PluginStoreService(fakeStore(), bus);

    await service.runQuery("select 1", "b");
    expect(send.mock.calls[0][0]).toBe("conn/executeQuery");
    expect(send.mock.calls[0][1]).toMatchObject({ queryText: "select 1", database: "b" });

    send.mockClear();
    await service.runQuery("select 1");
    expect(send.mock.calls[0][0]).toBe("conn/executeQuery");
    expect(send.mock.calls[0][1]).not.toHaveProperty("database");

    // a driver error reaches the plugin as is
    send.mockRejectedValueOnce(new Error('relation "nope" does not exist'));
    await expect(service.runQuery("select * from nope", "c")).rejects.toThrow('relation "nope" does not exist');
  });

  it("runQuery on a locked database rejects with the access code", async () => {
    const service = new PluginStoreService(fakeStore(), bus);
    send.mockRejectedValueOnce(Object.assign(new Error('permission denied for database "b"'), { code: "DATABASE_ACCESS_DENIED" }));

    const rejected = await service.runQuery("select 1", "b").then(() => null, (e) => e);
    expect(rejected.code).toBe("DATABASE_ACCESS_DENIED");
  });

  it("serialized tabs carry their database", () => {
    const service = new PluginStoreService(fakeStore(), bus);

    expect(service.serializeTab({ id: 1, tabType: "query", title: "Q", databaseName: "b" } as any)).toMatchObject({ databaseName: "b" });
    expect(service.serializeTab({ id: 2, tabType: "query", title: "Q", databaseName: null } as any)).toMatchObject({ databaseName: "a" });

    const table: any = service.serializeTab({ id: 3, tabType: "table", title: "orders", tableName: "orders", schemaName: "public", databaseName: "b" } as any);
    expect(table.databaseName).toBe("b");
    expect(table.data.table).toBe(ordersB);
  });

  it("connection info keeps the default database", () => {
    const service = new PluginStoreService(fakeStore(), bus);
    expect(service.getConnectionInfo().databaseName).toBe("a");
  });

  it("bridge routes the new requests", async () => {
    const pluginStore = { getDatabases: vi.fn(() => [{ name: "a" }]), runQuery: vi.fn(async () => ({ results: [] })) };
    const posted: any[] = [];
    const loader: any = {
      listeners: [],
      pluginStore,
      context: { store: pluginStore },
      checkPermission: () => undefined,
      postMessage: (_source: any, response: any) => posted.push(response),
    };
    const handle = (WebPluginLoader as any).prototype.handleViewRequest;

    await handle.call(loader, { id: "1", name: "getDatabases", args: undefined }, {});
    expect(pluginStore.getDatabases).toHaveBeenCalledTimes(1);
    expect(posted[0]).toMatchObject({ id: "1", result: [{ name: "a" }] });
    expect(posted[0].error).toBeUndefined();

    await handle.call(loader, { id: "2", name: "runQuery", args: { query: "select 1", database: "b" } }, {});
    expect(pluginStore.runQuery).toHaveBeenCalledWith("select 1", "b");
  });
});
