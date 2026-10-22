<template>
  <base-modal
    :name="modalName"
    @submit="save"
  >
    <template #title>
      Color for database <strong>{{ database }}</strong>
    </template>
    <color-picker v-model="color" />
    <template #footer="{ close }">
      <button
        class="btn btn-flat"
        type="button"
        @click.prevent="close"
      >
        Cancel
      </button>
      <button
        class="btn btn-primary"
        type="submit"
      >
        Save
      </button>
    </template>
  </base-modal>
</template>

<script lang="ts">
import Vue from "vue";
import BaseModal from "@/components/common/modals/BaseModal.vue";
import ColorPicker from "@/components/common/form/ColorPicker.vue";
import { AppEvent } from "@/common/AppEvent";

/** Picks the label color of one database, from the connection color palette */
export default Vue.extend({
  components: { BaseModal, ColorPicker },
  data() {
    return {
      modalName: "database-color-modal",
      database: null as string | null,
      /** the saved connection opened from the tree the database belongs to; null for the window's */
      connectionId: null as number | null,
      color: "default",
    };
  },
  computed: {
    rootBindings() {
      return [{ event: AppEvent.openDatabaseColorModal, handler: this.open }];
    },
  },
  methods: {
    /** a database of the window's connection, or `{ connectionId, database }` of a saved connection opened from the tree */
    open(target: string | { connectionId: number; database: string }) {
      const { connectionId, database } = typeof target === "string" ? { connectionId: null, database: target } : target;
      this.database = database;
      this.connectionId = connectionId;
      this.color = this.$store.getters["databaseLabels/colorOn"](connectionId, database) ?? "default";
      this.$modal.show(this.modalName);
    },
    async save(_event: Event, close: () => void) {
      const target = this.connectionId == null ? {} : { connectionId: this.connectionId };
      await this.$store.dispatch("databaseLabels/setColor", { databaseName: this.database, color: this.color, ...target });
      close();
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
});
</script>
