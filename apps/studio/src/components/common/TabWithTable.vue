<template>
  <div class="with-table-wrapper">
    <div
      class="no-content flex"
      v-if="missingConnection || secondary?.status === 'error'"
    >
      <div class="alert alert-danger expand">
        <i class="material-icons">error_outline</i>
        <div class="alert-body expand">
          {{ missingConnection ? 'Saved connection not found' : secondary.error }}
        </div>
        <a
          @click.prevent="$emit('close', tab)"
          class="btn btn-flat"
        >Close Tab</a>
      </div>
    </div>
    <div
      class="no-content flex"
      v-else-if="locked"
    >
      <div class="alert alert-danger expand">
        <i class="material-icons">lock</i>
        <div class="alert-body expand">
          No permission to access database {{ otherDatabase }} with the current account
        </div>
        <a
          @click.prevent="$emit('close', tab)"
          class="btn btn-flat"
        >Close Tab</a>
      </div>
    </div>
    <div v-else-if="!loaded">
      <x-progressbar />
    </div>
    <div
      class="no-content flex"
      v-else-if="!table"
    >
      <div class="alert alert-danger expand">
        <i class="material-icons">error_outline</i>
        <div class="alert-body expand">
          This table does not exist in the selected database
        </div>
        <a
          @click.prevent="$emit('close', tab)"
          class="btn btn-flat"
        >Close Tab</a>
      </div>
    </div>
    <template v-else>
      <slot :table="table" />
    </template>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import rawLog from '@bksLogger'
import { mapState } from 'vuex'
import { findTable } from '@/common/transport/TransportOpenTab'

const log = rawLog.scope('TabWithTable')

export default Vue.extend({
  props: ['tab'],
  computed: {
    ...mapState(['tablesInitialLoaded', 'database', 'databaseEntities', 'inaccessibleDatabases']),
    /** the saved connection opened from the tree the tab runs on, or null for the window's */
    targetConnectionId(): number | null {
      return this.tab?.targetConnectionId ?? null
    },
    secondary() {
      if (this.targetConnectionId == null) return null
      return this.$store.getters['connectionTree/connection'](this.targetConnectionId)
    },
    missingConnection(): boolean {
      if (this.targetConnectionId == null) return false
      return this.$store.getters.connectionContext(this.targetConnectionId).missing
    },
    locked(): boolean {
      if (this.secondary) {
        const database = this.tab?.databaseName
        return database != null && database !== this.secondary.database && this.secondary.inaccessibleDatabases.includes(database)
      }
      return !!this.otherDatabase && this.inaccessibleDatabases.includes(this.otherDatabase)
    },
    /** a tab bound to another database than the default one */
    otherDatabase(): string | null {
      if (this.targetConnectionId != null) return null
      const database = this.tab?.databaseName
      return database != null && database !== this.database ? database : null
    },
    loaded(): boolean {
      if (this.secondary) {
        const status = this.secondary.databaseEntities[this.tab?.databaseName ?? this.secondary.database]?.status
        return status === 'loaded' || status === 'error'
      }
      if (!this.otherDatabase) return this.tablesInitialLoaded
      const status = this.databaseEntities[this.otherDatabase]?.status
      return status === 'loaded' || status === 'error'
    },
    tables() {
      return this.$store.getters.tablesFor(this.tab?.databaseName, this.targetConnectionId)
    },
    table() {
      return findTable(this.tab, this.tables)
    },
  },
  watch: {
    table() {
      log.debug("table changed!", this.table)
    },
    otherDatabase: {
      immediate: true,
      handler(database: string | null) {
        if (database && !this.locked) this.$store.dispatch('loadDatabaseEntities', { database })
      }
    },
    // a tab restored on a saved connection connects it, then loads its database
    targetConnectionId: {
      immediate: true,
      async handler(id: number | null) {
        if (id == null || this.missingConnection) return
        if (await this.$store.dispatch('connectionTree/open', id)) {
          await this.$store.dispatch('connectionTree/loadDatabase', { id, database: this.tab?.databaseName ?? null })
        }
      }
    },
  }
})
</script>
<style lang="scss" scoped>
  .with-table-wrapper {
    display: flex;
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
  }
</style>
