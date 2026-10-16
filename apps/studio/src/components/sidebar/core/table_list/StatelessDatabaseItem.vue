<template>
  <div
    class="list-item schema-item database-item"
    :class="{ 'is-default': isDefault, locked }"
    :tabindex="locked ? 0 : null"
    :aria-disabled="locked ? 'true' : null"
    v-tooltip="locked ? { content: lockedTitle, trigger: 'hover focus' } : null"
    @contextmenu="$emit('contextmenu', $event)"
  >
    <div class="folder-group schema">
      <a
        class="folder-btn"
        :class="{ open: expanded }"
        role="button"
        @click.prevent="$emit('expand', $event)"
      >
        <span class="btn-fab open-close">
          <i class="dropdown-icon material-icons">keyboard_arrow_right</i>
        </span>
        <span
          class="database-label"
          :class="color ? `connection-label-color-${color}` : null"
        />
        <i
          title="Database"
          class="schema-icon item-icon material-icons"
        >storage</i>
        <span
          class="table-name truncate expand"
          :title="name"
        >{{ name }}</span>
        <i
          v-if="locked"
          class="material-icons lock-icon"
          aria-hidden="true"
        >lock</i>
        <span
          v-if="isDefault"
          class="database-badge"
          title="Default database"
        >default</span>
      </a>
      <div
        v-if="expanded && status === 'loading'"
        class="database-status"
      >
        Loading...
      </div>
      <div
        v-else-if="expanded && status === 'error'"
        class="database-status error"
      >
        <span
          class="truncate"
          :title="error"
        >{{ error }}</span>
        <a
          class="retry"
          role="button"
          @click.prevent="$emit('retry', $event)"
        >Retry</a>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  props: ["name", "expanded", "isDefault", "locked", "lockedTitle", "color", "status", "error"],
};
</script>

<style lang="scss" scoped>
.database-label {
  display: inline-block;
  width: 3px;
  height: 14px;
  border-radius: 3px;
  margin-right: 0.3rem;
  flex-shrink: 0;
  background-color: var(--connection-label-color, transparent);
}
.database-item.locked {
  opacity: 0.45;
  .folder-btn {
    cursor: not-allowed;
  }
  .lock-icon {
    font-size: 0.85rem;
    margin-left: 0.3rem;
  }
}
.database-badge {
  font-size: 0.7rem;
  opacity: 0.6;
  margin-left: 0.4rem;
}
.database-status {
  display: flex;
  gap: 0.5rem;
  padding: 0.2rem 0 0.2rem 2.4rem;
  font-size: 0.8rem;
  opacity: 0.7;
  &.error {
    opacity: 1;
  }
  .retry {
    cursor: pointer;
    text-decoration: underline;
    flex-shrink: 0;
  }
}
</style>
