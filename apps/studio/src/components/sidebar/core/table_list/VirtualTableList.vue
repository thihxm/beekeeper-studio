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
    :extra-props="{ onExpand: handleExpand, onPin: handlePin, onRetry: handleRetry, lockedTitle }"
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

type Entity = TableOrView | Routine | string;

type Item = DatabaseItem | SchemaItem | TableItem | RoutineItem;

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
  type: "database" | "schema" | "table" | "routine" | "root";
  entity: Entity;
  /** the database the item belongs to; null for the default database */
  database?: string | null;
  key: string;
  expanded: boolean;
  hidden: boolean;
  contextMenu: any[];
  level: number;
  parent?: BaseItem;
  pinned: boolean;
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
        database: string | null
      ) => {
        // the default database keeps its historic keys; others are prefixed
        const prefix = database == null ? "" : `${database}::`;
        const db = database ?? this.database;
        const hiddenSchemas = this.hiddenSchemasFor(db);
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
              expanded: expanded(key, this.defaultSchema === group.schema),
              hidden: hiddenSchemas.includes(group.schema),
              contextMenu: database == null ? this.schemaMenuOptions : [],
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
              expanded: expanded(key, false),
              hidden: this.isHiddenEntity(table, db),
              contextMenu: database == null ? this.tableMenuOptions : this.otherDatabaseTableMenuOptions(database),
              parent: groupParent,
              level: childLevel,
              pinned: this.isPinned(table, db),
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
              expanded: expanded(key, false),
              hidden: this.isHiddenEntity(routine, db),
              contextMenu: database == null ? this.routineMenuOptions : [],
              parent: groupParent,
              level: childLevel,
              pinned: this.isPinned(routine, db),
            });
          });
        });
      };

      if (!this.multipleDatabases) {
        addEntities(this.schemaTables, root, 0, null);
      } else {
        // no default database: its entities stay at the top, as before
        if (!this.databaseList.includes(this.database)) {
          addEntities(this.schemaTables, root, 0, null);
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
            status: isDefault ? "loaded" : loaded?.status ?? "idle",
            error: loaded?.error,
            // a locked database never opens, even if it was expanded before the lock
            expanded: !isDefault && this.inaccessibleDatabases.includes(name) ? false : expanded(key, isDefault),
            hidden: false,
            contextMenu: [],
            parent: root,
            level: 0,
            pinned: false,
          };
          items.push(databaseItem);
          if (isDefault) {
            addEntities(this.schemaTables, databaseItem, 1, null);
          } else if (loaded?.status === "loaded") {
            const tables = entityFilter(loaded.tables, this.entityFilter);
            const routines = entityFilter(loaded.routines, this.entityFilter);
            addEntities(groupBySchema(tables, routines), databaseItem, 1, name);
          }
        }
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
        if (parent.hidden || !parent.expanded) return false;
      }
      return true;
    },
    loadDatabase(item: DatabaseItem, force = false) {
      if (item.isDefault || item.locked) return;
      this.$store.dispatch("loadDatabaseEntities", { database: item.entity, force });
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

        if (!item.hidden && this.isVisible(item)) {
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
      this.generateDisplayItems();
    },
    handleRetry(_: Event, item: DatabaseItem) {
      this.loadDatabase(item, true);
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
      ];
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
        this.inaccessibleDatabases,
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
    }),
    ...mapState(["database", "databaseList", "databaseEntities", "entityFilter", "inaccessibleDatabases", "usedConfig"]),
    /** tooltip of a locked database node */
    lockedTitle() {
      const username = this.usedConfig?.username;
      return (name: string) =>
        `No permission to access database ${name} with the current account${username ? ` (${username})` : ""}`;
    },
    ...mapState("pins", ["pins"]),
    ...mapState("hideEntities", {
      hiddenEntityRecords: "entities",
      hiddenSchemaRecords: "schemas",
    }),
  },
  watch: {
    regenerateOn() {
      this.generateItems();
      this.generateDisplayItems();
    },
    minimalMode() {
      this.generateDisplayItems();
    },
  },
  mounted() {
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
