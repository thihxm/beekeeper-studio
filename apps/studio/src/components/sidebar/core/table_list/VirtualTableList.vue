<template>
  <virtual-list
    ref="vList"
    class="virtual-table-list list-body"
    :class="{ 'list-body-empty': displayItems.length === 0 }"
    :data-key="'key'"
    :data-sources="displayItems"
    :data-component="itemComponent"
    :estimate-size="estimateItemHeight"
    :keeps="keeps"
    :extra-props="{ onExpand: handleExpand, onPin: handlePin, onRetry: handleRetry, lockedTitle, isOpen }"
  />
</template>

<script lang="ts">
/*

In some cases, there are databases that have over 1000 tables or even much
more. Without optimizing the table list, it can be very slow.

This component will render the items that are visible. Items that are outside
the viewport are destroyed. So all the states that need to be persistent
should be stored here instead of the item component.

*/

import Vue from "vue";
import { TableOrView, Routine } from "@/lib/db/models";
import TableListContextMenus from "@/mixins/TableListContextMenus";
import ItemComponent from "./Item.vue";
import VirtualList from "vue-virtual-scroll-list";
import { AppEvent } from "@/common/AppEvent";
import { mapGetters, mapState } from "vuex";
import { entityId } from "@/common/utils";
import "scrollyfills";
import { matches as matchesPin } from "@/common/transport/TransportPinnedEntity";
import { matches as matchesHidden } from "@/common/transport/TransportHidden";
import { entityFilter } from "@/lib/db/sql_tools";
import _ from "lodash";
import { getDialectData } from "@shared/lib/dialects";
import { dialectFor } from "@shared/lib/dialects/models";
import { IConnection } from "@/common/interfaces/IConnection";
import { BeekeeperPlugin } from "@/plugins/BeekeeperPlugin";

type Entity = TableOrView | Routine | string;

type Item = ConnectionItem | DatabaseItem | SchemaItem | TableItem | RoutineItem;

interface SchemaGroup {
  schema: string | null;
  tables: TableOrView[];
  routines: Routine[];
}

/** Same grouping as the root `schemaTables` getter, for any database */
function groupBySchema(tables: TableOrView[], routines: Routine[]): SchemaGroup[] {
  const schemas = _.uniq([...tables, ...routines].map((e) => e.schema));
  if (schemas.length <= 1) {
    return [{ schema: schemas[0] ?? null, tables, routines }];
  }
  const tablesBySchema = _.groupBy(tables, "schema");
  const routinesBySchema = _.groupBy(routines, "schema");
  return _.orderBy(schemas, (s) => (s === "public" ? "0" : s)).map((schema) => ({
    schema,
    tables: tablesBySchema[schema] || [],
    routines: routinesBySchema[schema] || [],
  }));
}

interface BaseItem {
  type: "connection" | "database" | "schema" | "table" | "routine" | "root";
  entity: Entity;
  /** the database the item belongs to; null for the default database */
  database?: string | null;
  /** the saved connection opened from the tree the item belongs to; null for the window's */
  connectionId?: number | null;
  key: string;
  expanded: boolean;
  hidden: boolean;
  contextMenu: any[];
  level: number;
  parent?: BaseItem;
  pinned: boolean;
  /** a database or schema with an entity under it that passes the filter */
  hasMatch?: boolean;
}

interface ConnectionItem extends BaseItem {
  type: "connection";
  /** the connection's name */
  entity: string;
  isWindow: boolean;
  /** saved label color, or null */
  color: string | null;
  status: "idle" | "connecting" | "connected" | "error";
  error?: string;
}

/** Where entities of a secondary connection live in the tree */
interface Owner {
  connectionId: number;
  /** key prefix of everything under the connection */
  prefix: string;
  defaultSchema: string | null;
}

/** The saved label color of a connection, null for none */
function colorOf(config: IConnection | null): string | null {
  const color = config?.labelColor;
  return color && color !== "default" ? color : null;
}

interface RootItem extends BaseItem {
  type: "root";
  entity: string;
}

interface DatabaseItem extends BaseItem {
  type: "database";
  entity: string;
  isDefault: boolean;
  /** the current account can't open it */
  locked: boolean;
  /** label color from the connection palette, or null */
  color: string | null;
  status: "idle" | "loading" | "loaded" | "error";
  error?: string;
}

interface SchemaItem extends BaseItem {
  type: "schema";
  entity: string;
  parent: BaseItem;
}

interface TableItem extends BaseItem {
  type: "table";
  entity: TableOrView;
  parent: BaseItem;
  loadingColumns: boolean;
}

interface RoutineItem extends BaseItem {
  type: "routine";
  entity: Routine;
  parent: BaseItem;
}

export default Vue.extend({
  mixins: [TableListContextMenus],
  components: { VirtualList },
  data() {
    return {
      items: [],
      displayItems: [],
      itemComponent: ItemComponent,
      estimateItemHeight: this.$bksConfig.ui.tableList.itemHeight, // height of collapsed item
      keeps: 30,
      generated: false,
      /** a key to reveal once its database finishes loading */
      pendingReveal: null as string | null,
    };
  },
  methods: {
    generateItems() {
      const items = [] as Item[];
      const root: RootItem = {
        type: "root",
        entity: "",
        key: "",
        expanded: true,
        hidden: false,
        contextMenu: [],
        level: 0,
        pinned: false,
      };

      // keep what the user expanded; items seen for the first time get the default
      const previous = new Map<string, boolean>();
      for (const item of this.items) previous.set(item.key, item.expanded);
      const expanded = (key: string, initial: boolean) =>
        previous.has(key) ? previous.get(key) : initial;

      const addEntities = (
        groups: SchemaGroup[],
        parent: BaseItem,
        level: number,
        database: string | null,
        owner: Owner | null = null
      ) => {
        // the default database keeps its historic keys; others are prefixed
        const prefix = owner ? `${owner.prefix}${database}::` : database == null ? "" : `${database}::`;
        const db = database ?? this.database;
        // pins, hidden entities and their menus belong to the window's connection
        const hiddenSchemas = owner ? [] : this.hiddenSchemasFor(db);
        const defaultSchema = owner ? owner.defaultSchema : this.defaultSchema;
        const connectionId = owner?.connectionId ?? null;
        const noFolder = groups.length === 1;
        groups.forEach((group) => {
          let groupParent = parent;
          if (!noFolder) {
            const key = prefix + entityId(group.schema);
            const schemaItem: SchemaItem = {
              type: "schema",
              key,
              entity: group.schema,
              database,
              connectionId,
              expanded: expanded(key, defaultSchema === group.schema),
              hidden: hiddenSchemas.includes(group.schema),
              contextMenu: owner ? [] : database == null ? this.schemaMenuOptions : [],
              parent,
              level,
              pinned: false,
            };
            items.push(schemaItem);
            groupParent = schemaItem;
          }
          const childLevel = noFolder ? level : level + 1;
          group.tables.forEach((table: TableOrView) => {
            const key = prefix + entityId(group.schema, table);
            items.push({
              type: "table",
              key,
              entity: table,
              database,
              connectionId,
              expanded: expanded(key, false),
              hidden: !owner && this.isHiddenEntity(table, db),
              contextMenu: owner ? this.secondaryEntityMenu(owner.connectionId, database) :
                database == null ? this.tableMenuOptions : this.otherDatabaseTableMenuOptions(database),
              parent: groupParent,
              level: childLevel,
              pinned: !owner && this.isPinned(table, db),
              loadingColumns: false,
            });
          });
          group.routines.forEach((routine: Routine) => {
            const key = prefix + entityId(group.schema, routine);
            items.push({
              entity: routine,
              key,
              type: "routine",
              database,
              connectionId,
              expanded: expanded(key, false),
              hidden: !owner && this.isHiddenEntity(routine, db),
              contextMenu: owner ? [] : database == null ? this.routineMenuOptions : [],
              parent: groupParent,
              level: childLevel,
              pinned: !owner && this.isPinned(routine, db),
            });
          });
        });
      };

      const addWindow = (parent: BaseItem, level: number) => {
        if (!this.multipleDatabases) {
          addEntities(this.schemaTables, parent, level, null);
        } else {
          // no default database: its entities stay at the top, as before
          if (!this.databaseList.includes(this.database)) {
            addEntities(this.schemaTables, parent, level, null);
          }
          for (const name of this.databaseList) {
            const isDefault = name === this.database;
            const loaded = this.databaseEntities[name];
            const key = `database::${name}`;
            const databaseItem: DatabaseItem = {
              type: "database",
              key,
              entity: name,
              database: isDefault ? null : name,
              isDefault,
              locked: !isDefault && this.inaccessibleDatabases.includes(name),
              color: this.colorFor(name),
              status: isDefault ? "loaded" : loaded?.status ?? "idle",
              error: loaded?.error,
              // a locked database never opens, even if it was expanded before the lock
              expanded: !isDefault && this.inaccessibleDatabases.includes(name) ? false : expanded(key, isDefault),
              hidden: false,
              contextMenu: this.databaseMenuOptions,
              parent,
              level,
              pinned: false,
            };
            items.push(databaseItem);
            if (isDefault) {
              addEntities(this.schemaTables, databaseItem, level + 1, null);
            } else if (loaded?.status === "loaded") {
              const tables = entityFilter(loaded.tables, this.entityFilter);
              const routines = entityFilter(loaded.routines, this.entityFilter);
              addEntities(groupBySchema(tables, routines), databaseItem, level + 1, name);
            }
          }
        }
      };

      /** A saved connection opened next to the window's, and what it has loaded */
      const addSecondary = (config: IConnection) => {
        const id = config.id;
        const node = this.secondaryConnection(id);
        const key = `connection::${id}`;
        const owner: Owner = { connectionId: id, prefix: `${key}::`, defaultSchema: node.defaultSchema ?? null };
        const closed = node.status === "idle" || node.status === "error";
        const connectionItem: ConnectionItem = {
          type: "connection",
          key,
          entity: config.name,
          connectionId: id,
          isWindow: false,
          color: colorOf(config),
          status: node.status,
          error: node.error,
          expanded: closed ? false : expanded(key, false),
          hidden: false,
          contextMenu: this.secondaryConnectionMenu(id),
          parent: root,
          level: 0,
          pinned: false,
        };
        items.push(connectionItem);
        if (node.status !== "connected") return;

        const filtered = (database: string | null) => {
          const loaded = node.databaseEntities[database];
          return groupBySchema(entityFilter(loaded?.tables ?? [], this.entityFilter), entityFilter(loaded?.routines ?? [], this.entityFilter));
        };
        const dialect = getDialectData(dialectFor(node.connectionType));
        if (dialect?.disabledFeatures?.multipleDatabases || node.databaseList.length === 0) {
          if (node.databaseEntities[node.database]?.status === "loaded") {
            addEntities(filtered(node.database), connectionItem, 1, node.database, owner);
          }
          return;
        }
        for (const name of node.databaseList) {
          const isDefault = name === node.database;
          const loaded = node.databaseEntities[name];
          const databaseKey = `${owner.prefix}database::${name}`;
          const locked = !isDefault && node.inaccessibleDatabases.includes(name);
          const databaseItem: DatabaseItem = {
            type: "database",
            key: databaseKey,
            entity: name,
            database: name,
            connectionId: id,
            isDefault,
            locked,
            color: null,
            status: loaded?.status ?? "idle",
            error: loaded?.error,
            expanded: locked ? false : expanded(databaseKey, isDefault),
            hidden: false,
            contextMenu: this.secondaryDatabaseMenu(id, name),
            parent: connectionItem,
            level: 1,
            pinned: false,
          };
          items.push(databaseItem);
          if (loaded?.status === "loaded") addEntities(filtered(name), databaseItem, 2, name, owner);
        }
      };

      const secondaries: IConnection[] = this.connectionLevel ? this.listedConnections : [];
      if (secondaries.length === 0) {
        addWindow(root, 0);
      } else {
        const windowKey = "connection::window";
        const windowItem: ConnectionItem = {
          type: "connection",
          key: windowKey,
          entity: this.windowConnectionName,
          connectionId: null,
          isWindow: true,
          color: colorOf(this.usedConfig),
          status: "connected",
          expanded: expanded(windowKey, true),
          hidden: false,
          contextMenu: [],
          parent: root,
          level: 0,
          pinned: false,
        };
        items.push(windowItem);
        addWindow(windowItem, 1);
        secondaries.forEach(addSecondary);
      }

      for (const item of items) {
        if (item.type !== "table" && item.type !== "routine") continue;
        const ancestors: BaseItem[] = [];
        for (let parent = item.parent; parent; parent = parent.parent) ancestors.push(parent);
        // a hidden entity, or one under a hidden schema, is not a match the user can see
        if (item.hidden || ancestors.some((a) => a.hidden)) continue;
        for (const ancestor of ancestors) ancestor.hasMatch = true;
      }

      this.items = items;
      this.generated = true;
    },
    isPinned(entity: TableOrView | Routine, database: string) {
      return this.pins.some((pin) => pin.databaseName === database && matchesPin(pin, entity));
    },
    isHiddenEntity(entity: TableOrView | Routine, database: string) {
      return this.hiddenEntityRecords.some(
        (hidden) => hidden.databaseName === database && matchesHidden(hidden, entity)
      );
    },
    hiddenSchemasFor(database: string): string[] {
      return this.hiddenSchemaRecords
        .filter((s) => s.databaseName === database)
        .map((s) => s.name);
    },
    isVisible(item: Item) {
      for (let parent = item.parent; parent; parent = parent.parent) {
        if (parent.hidden || !this.isOpen(parent)) return false;
      }
      return true;
    },
    /** What a node shows: what the user expanded, or opened by the filter */
    isOpen(item: BaseItem) {
      return item.expanded || this.openedByFilter(item);
    },
    /** While filtering, nodes with a match show open without touching what the user expanded */
    openedByFilter(item: BaseItem) {
      if (!this.filtering || !item.hasMatch) return false;
      // a locked database never opens, even with entities loaded before the lock
      if (item.type === "database") return !(item as DatabaseItem).locked;
      return item.type === "schema" || item.type === "connection";
    },
    /** While filtering, a loaded database with no match is left out; locked ones stay listed */
    filteredOut(item: Item) {
      return this.filtering && item.type === "database" && !item.isDefault && !item.locked &&
        item.status === "loaded" && !item.hasMatch;
    },
    loadDatabase(item: DatabaseItem, force = false) {
      if (item.locked) return;
      if (item.connectionId != null) {
        this.$store.dispatch("connectionTree/loadDatabase", { id: item.connectionId, database: item.entity, force });
        return;
      }
      if (item.isDefault) return;
      this.$store.dispatch("loadDatabaseEntities", { database: item.entity, force });
    },
    /** Connects a saved connection listed in the tree, in its own session */
    openConnection(item: ConnectionItem) {
      if (item.isWindow) return;
      this.$store.dispatch("connectionTree/open", item.connectionId);
    },
    /** Expand the tree down to `key` and scroll to it, if the config allows */
    revealItem(key: string) {
      if (!this.$bksConfig.ui.tableList.revealActiveEntity) return;
      let item = this.items.find((i: Item) => i.key === key);
      if (!item) {
        // an entity of a database that isn't loaded yet: open it, and reveal once it loads
        const database = key.includes("::") ? key.split("::")[0] : null;
        const databaseItem = database && this.items.find((i: Item) => i.type === "database" && i.entity === database);
        if (!databaseItem || databaseItem.locked) return;
        databaseItem.expanded = true;
        this.pendingReveal = key;
        this.loadDatabase(databaseItem);
        this.generateDisplayItems();
        return;
      }
      this.pendingReveal = null;
      for (let parent = item.parent; parent; parent = parent.parent) {
        parent.expanded = true;
      }
      this.generateDisplayItems();
      const index = this.displayItems.indexOf(item);
      if (index >= 0) this.$refs.vList?.scrollToIndex(index);
    },
    expandDatabase(name: string) {
      const item = this.items.find((i: Item) => i.type === "database" && i.entity === name);
      if (!item) return;
      item.expanded = true;
      this.loadDatabase(item);
      this.generateDisplayItems();
    },
    generateDisplayItems() {
      let totalHeight = 0;
      const displayItems: Item[] = [];
      const items: Item[] = this.items;

      for (const item of items) {
        // Skip rendering routines in minimal mode
        if (this.$store.getters.minimalMode && item.type === 'routine') {
          continue;
        }

        if (!item.hidden && !this.filteredOut(item) && this.isVisible(item)) {
          displayItems.push(item);

          // Summarizing the total height of all list items to get the average height

          totalHeight += this.$bksConfig.ui.tableList.itemHeight; // height of list item

          if (item.expanded) {
            if (item.type === "table") {
              const cols = item.entity.columns?.length ?? 1;
              totalHeight += cols * 20.29; // plus column height when expanded
            } else if (item.type === "routine") {
              const params = item.entity.routineParams?.length ?? 0;
              totalHeight += params * 20.29;
            }
          }
        }
      }

      if (displayItems.length > 0) {
        this.estimateItemHeight = totalHeight / displayItems.length;
      } else {
        this.estimateItemHeight = this.$bksConfig.ui.tableList.itemHeight;
      }
      this.displayItems = displayItems;
    },
    loadColumns(item: TableItem) {
      item.loadingColumns = true;
      this.$nextTick(() => {
        this.$store.dispatch("updateDatabaseTableColumns", { database: item.database, table: item.entity }).finally(() => {
          item.loadingColumns = false;
        });
      });
    },
    updateTableColumnsInRange(whenEmpty = false) {
      const range = this.$refs.vList.range;

      for (let i = range.start; i < range.end + 1; i++) {
        const item = this.displayItems[i];
        if (!item.expanded) continue;
        if (item.type !== "table") continue;
        if (whenEmpty && item.entity.columns?.length) continue;
        if (item.loadingColumns) continue;

        this.loadColumns(item);
      }
    },
    handleExpand(_: Event, item: Item) {
      if (item.type === "database" && item.locked) return;
      item.expanded = !item.expanded;
      if (item.expanded && item.type === "table") {
        this.loadColumns(item);
      }
      if (item.expanded && item.type === "database") {
        this.loadDatabase(item);
      }
      if (item.expanded && item.type === "connection" && (item.status === "idle" || item.status === "error")) {
        this.openConnection(item);
      }
      this.generateDisplayItems();
    },
    handleRetry(_: Event, item: DatabaseItem | ConnectionItem) {
      if (item.type === "connection") this.openConnection(item);
      else this.loadDatabase(item, true);
    },
    handlePin(_: Event, item: TableItem) {
      this.trigger(AppEvent.togglePinTableList, item.entity, !item.pinned);
    },
    handleToggleHidden(
      entity: TableOrView | Routine | string,
      hidden?: boolean
    ) {
      const item = this.items.find((item: Item) => item.entity === entity);
      if (!item) return;
      if (typeof hidden === "undefined") {
        hidden = !item.hidden;
      }
      item.hidden = hidden;
      this.generateDisplayItems();
    },
    handleToggleExpandedAll(expand?: boolean) {
      if (typeof expand === "undefined") {
        expand = false;
      }
      this.items.forEach((item: Item) => {
        item.expanded = expand;
      });
      this.generateDisplayItems();
      if (expand) {
        this.$nextTick(() => {
          this.updateTableColumnsInRange();
        });
      }
    },
    handleTogglePinned(entity: Entity, pinned?: boolean) {
      const item = this.items.find((item: Item) => item.entity === entity);
      if (!item) return;

      if (typeof pinned === "undefined") {
        pinned = !item.pinned;
      }
      item.pinned = pinned;
    },
    handleScrollEnd() {
      this.updateTableColumnsInRange(true);
    },
  },
  computed: {
    resizeObserver() {
      return new ResizeObserver(() => {
        const vListHeight = this.$refs.vList.$el.clientHeight;
        const minKeeps = Math.ceil(vListHeight / this.estimateItemHeight);
        this.keeps = Math.max(30, Math.ceil(minKeeps * 1.3));
      });
    },
    rootBindings() {
      return [
        { event: AppEvent.toggleHideSchema, handler: this.handleToggleHidden },
        { event: AppEvent.toggleHideEntity, handler: this.handleToggleHidden },
        {
          event: AppEvent.toggleExpandTableList,
          handler: this.handleToggleExpandedAll,
        },
        {
          event: AppEvent.togglePinTableList,
          handler: this.handleTogglePinned,
        },
        { event: AppEvent.expandDatabase, handler: this.expandDatabase },
        { event: AppEvent.revealSidebarItem, handler: this.revealItem },
      ];
    },
    filtering() {
      return !!this.entityFilter?.filterQuery;
    },
    savedConnectionItems() {
      return this.$store.state["data/connections"]?.items;
    },
    multipleDatabases() {
      return !this.dialectData?.disabledFeatures?.multipleDatabases && this.databaseList.length > 0;
    },
    regenerateOn() {
      return [
        this.schemaTables,
        this.multipleDatabases,
        this.databaseList,
        this.database,
        this.databaseEntities,
        this.entityFilter.filterQuery,
        this.inaccessibleDatabases,
        this.listedConnections,
        this.secondaryConnections,
        this.connectionLevel,
        // the Disconnect action is disabled while a tab on the connection is busy
        this.busyTabs,
        // the colorFor getter returns the same function as labels change; watch the labels themselves
        this.databaseLabelRecords,
        this.pins,
        this.hiddenEntityRecords,
        this.hiddenSchemaRecords,
      ];
    },
    ...mapGetters({
      defaultSchema: "defaultSchema",
      schemaTables: "schemaTables",
      minimalMode: "minimalMode",
      dialectData: "dialectData",
      colorFor: "databaseLabels/colorFor",
    }),
    // read without map helpers: a store without the connectionTree module lists nothing
    listedConnections(): IConnection[] {
      return this.$store.getters["connectionTree/listed"] ?? [];
    },
    secondaryConnection() {
      return this.$store.getters["connectionTree/connection"];
    },
    secondaryConnections() {
      return this.$store.state.connectionTree?.connections;
    },
    busyTabs() {
      return this.$store.state.connectionTree?.busyTabs;
    },
    /** The tree lists saved connections; not in PIN lock mode, where connecting needs the PIN */
    connectionLevel() {
      return this.$bksConfig.security?.lockMode !== "pin";
    },
    windowConnectionName() {
      return this.usedConfig?.name || (this.usedConfig ? BeekeeperPlugin.buildConnectionName(this.usedConfig) : "Connection");
    },
    secondaryConnectionMenu() {
      return (id: number) => {
        const busy = Object.values(this.busyTabs ?? {}).includes(id);
        return [
          {
            name: "New query",
            slug: "connection-new-query",
            handler: () => this.trigger(AppEvent.newQueryOnConnection, { connectionId: id, database: null }),
          },
          {
            name: "Refresh",
            slug: "connection-refresh",
            handler: () => this.$store.dispatch("connectionTree/refresh", id),
          },
          {
            name: "Disconnect",
            slug: "connection-disconnect",
            class: busy ? "disabled" : "",
            title: busy ? "A tab on this connection has an open transaction" : "",
            handler: () => {
              if (!busy) this.$store.dispatch("connectionTree/disconnect", id);
            },
          },
        ];
      };
    },
    secondaryDatabaseMenu() {
      return (id: number, database: string) => [
        {
          name: "New query",
          slug: "database-new-query",
          handler: () => this.trigger(AppEvent.newQueryOnConnection, { connectionId: id, database }),
        },
      ];
    },
    secondaryEntityMenu() {
      return (id: number, database: string | null) => [
        {
          name: "View Data",
          slug: "view-data",
          handler: ({ item }) => this.$root.$emit(AppEvent.loadTable, { table: item, database, connectionId: id }),
        },
        {
          name: "View Structure",
          slug: "view-structure",
          handler: ({ item }) => this.$root.$emit(AppEvent.openTableProperties, { table: item, database, connectionId: id }),
        },
        {
          name: "New query",
          slug: "entity-new-query",
          handler: () => this.trigger(AppEvent.newQueryOnConnection, { connectionId: id, database }),
        },
        {
          name: "Copy Name",
          slug: "copy-name",
          handler: ({ item }) => this.$copyText(item.name),
        },
      ];
    },
    databaseMenuOptions() {
      return [
        {
          name: "Set color",
          slug: "database-color",
          handler: ({ item }) => this.trigger(AppEvent.openDatabaseColorModal, item),
        },
      ];
    },
    ...mapState(["database", "databaseList", "databaseEntities", "entityFilter", "inaccessibleDatabases", "usedConfig"]),
    /** tooltip of a locked database node */
    lockedTitle() {
      const username = this.usedConfig?.username;
      return (name: string) =>
        `No permission to access database ${name} with the current account${username ? ` (${username})` : ""}`;
    },
    ...mapState("pins", ["pins"]),
    ...mapState("databaseLabels", { databaseLabelRecords: "labels" }),
    ...mapState("hideEntities", {
      hiddenEntityRecords: "entities",
      hiddenSchemaRecords: "schemas",
    }),
  },
  watch: {
    regenerateOn() {
      this.generateItems();
      this.generateDisplayItems();
      if (this.pendingReveal) this.$nextTick(() => this.pendingReveal && this.revealItem(this.pendingReveal));
    },
    minimalMode() {
      this.generateDisplayItems();
    },
    // a saved connection created, renamed, recolored or deleted
    savedConnectionItems() {
      if (this.$store.state.connectionTree) this.$store.dispatch("connectionTree/loadSaved");
    },
  },
  mounted() {
    if (this.$store.state.connectionTree) this.$store.dispatch("connectionTree/loadSaved");
    this.generateItems();
    this.generateDisplayItems();
    this.registerHandlers(this.rootBindings);
    this.$nextTick(() => this.resizeObserver.observe(this.$refs.vList.$el));
    this.$refs.vList.$el.addEventListener("scrollend", this.handleScrollEnd);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
    this.resizeObserver.disconnect();
    this.$refs.vList.$el.removeEventListener("scrollend", this.handleScrollEnd);
  },
});
</script>
