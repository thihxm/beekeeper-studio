<template>
  <stateless-connection-item
    v-if="source.type === 'connection'"
    :style="{ '--level': source.level }"
    :name="source.entity"
    :expanded="isOpen(source)"
    :is-window="source.isWindow"
    :color="source.color"
    :status="source.status"
    :error="source.error"
    @expand="onExpand($event, source)"
    @retry="onRetry($event, source)"
    @contextmenu.prevent.stop="
      $bks.openMenu({
        id: 'entity.connection',
        event: $event,
        item: source,
        options: source.contextMenu,
      })
    "
  />
  <stateless-database-item
    v-else-if="source.type === 'database'"
    :style="{ '--level': source.level }"
    :name="source.entity"
    :expanded="isOpen(source)"
    :is-default="source.isDefault"
    :locked="source.locked"
    :color="source.color"
    :locked-title="lockedTitle(source.entity)"
    :status="source.status"
    :error="source.error"
    @expand="onExpand($event, source)"
    @retry="onRetry($event, source)"
    @contextmenu.prevent.stop="
      $bks.openMenu({
        id: 'entity.database',
        event: $event,
        item: source.entity,
        options: source.contextMenu,
      })
    "
  />
  <stateless-sidebar-folder
    v-else-if="source.type === 'schema'"
    :level="source.level"
    v-show="!source.hidden"
    :expanded="isOpen(source)"
    :schema="source.entity"
    @expand="onExpand($event, source)"
    @contextmenu.prevent.stop="
      $bks.openMenu({
        id: 'entity.schema',
        event: $event,
        item: source.entity,
        options: source.contextMenu,
      })
    "
  />
  <stateless-table-list-item
    v-else-if="source.type === 'table'"
    :id="source.key"
    :level="source.level"
    :expanded="source.expanded"
    :table="source.entity"
    :database="source.database"
    :pinned="source.pinned"
    :loading-columns="source.loadingColumns"
    @expand="onExpand($event, source)"
    @pin="onPin($event, source)"
    @contextmenu.prevent.stop="
      $bks.openMenu({
        id: 'entity.table',
        event: $event,
        item: source.entity,
        options: source.contextMenu,
      })
    "
  />
  <stateless-routine-list-item
    v-else-if="source.type === 'routine'"
    :level="source.level"
    :expanded="source.expanded"
    :routine="source.entity"
    :pinned="source.pinned"
    @expand="onExpand($event, source)"
    @pin="onPin($event, source)"
    @contextmenu.prevent.stop="
      $bks.openMenu({
        id: 'entity.routine',
        event: $event,
        item: source.entity,
        options: source.contextMenu,
      })
    "
  />
</template>

<script lang="ts">
import Vue from "vue";
import StatelessTableListItem from "./StatelessTableListItem.vue";
import StatelessRoutineListItem from "./StatelessRoutineListItem.vue";
import StatelessSidebarFolder from "@/components/common/StatelessSidebarFolder.vue";
import StatelessDatabaseItem from "./StatelessDatabaseItem.vue";
import StatelessConnectionItem from "./StatelessConnectionItem.vue";
export default Vue.extend({
  components: {
    StatelessConnectionItem,
    StatelessDatabaseItem,
    StatelessTableListItem,
    StatelessRoutineListItem,
    StatelessSidebarFolder,
  },
  props: ["source", "onExpand", "onPin", "onRetry", "lockedTitle", "isOpen"],
});
</script>
