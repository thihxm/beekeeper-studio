<template>
  <label
    class="query-database-selector"
    :title="disabled ? 'The database can\'t change while a transaction or manual commit is open' : 'Database this query runs on'"
  >
    <i class="material-icons">storage</i>
    <select
      :value="database"
      :disabled="disabled"
      @change="$emit('change', $event.target.value)"
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

export default Vue.extend({
  props: {
    /** the database the tab runs on */
    database: { type: String, default: null },
    databases: { type: Array, default: () => [] },
    disabled: { type: Boolean, default: false },
  },
  computed: {
    options(): string[] {
      const list = this.databases as string[];
      if (this.database == null || list.includes(this.database)) return list;
      return [this.database, ...list];
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
