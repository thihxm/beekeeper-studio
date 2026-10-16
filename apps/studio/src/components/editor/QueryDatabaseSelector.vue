<template>
  <label
    class="query-database-selector"
    :title="locked ? 'The database can\'t change while a transaction or manual commit is open' : 'Database this query runs on'"
  >
    <i class="material-icons">storage</i>
    <select
      :value="database"
      :disabled="locked"
      @change="select($event.target.value)"
    >
      <option
        v-for="name in options"
        :key="name"
        :value="name"
      >
        {{ name }}
      </option>
    </select>
  </label>
</template>

<script lang="ts">
import Vue from "vue";

/** Shows and changes the database a query tab runs on */
export default Vue.extend({
  props: {
    tab: { type: Object, required: true },
    hasActiveTransaction: { type: Boolean, default: false },
    isManualCommit: { type: Boolean, default: false },
  },
  computed: {
    /** the tab's database; a tab without one runs on the default database */
    database(): string | null {
      return this.tab.databaseName ?? this.$store.state.database ?? null;
    },
    /** a transaction or a reserved (manual commit) connection is tied to one database */
    locked(): boolean {
      return this.hasActiveTransaction || this.isManualCommit;
    },
    options(): string[] {
      const list = this.$store.state.databaseList as string[];
      if (this.database == null || list.includes(this.database)) return list;
      return [this.database, ...list];
    },
  },
  methods: {
    select(database: string) {
      if (this.locked || database === this.database) return;
      this.tab.databaseName = database;
      this.$emit("change", database);
    },
  },
});
</script>

<style lang="scss" scoped>
.query-database-selector {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-right: 0.5rem;
  .material-icons {
    font-size: 1rem;
    opacity: 0.7;
  }
  select {
    max-width: 12rem;
  }
}
</style>
