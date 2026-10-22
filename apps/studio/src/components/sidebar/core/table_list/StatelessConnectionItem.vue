<template>
  <div
    class="list-item schema-item connection-item"
    :class="{ 'is-window': isWindow }"
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
          v-if="color"
          class="connection-color"
          :class="`connection-label-color-${color}`"
        />
        <i
          title="Connection"
          class="schema-icon item-icon material-icons"
        >lan</i>
        <span
          class="table-name truncate expand"
          :title="name"
        >{{ name }}</span>
      </a>
      <div
        v-if="status === 'connecting'"
        class="connection-status"
      >
        Connecting...
      </div>
      <div
        v-else-if="status === 'error'"
        class="connection-status error"
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
/** A saved connection in the entity tree: the window's own, or one opened next to it */
export default {
  props: ["name", "expanded", "isWindow", "color", "status", "error"],
};
</script>

<style lang="scss" scoped>
.connection-color {
  display: inline-block;
  width: 3px;
  height: 14px;
  border-radius: 3px;
  margin-right: 0.3rem;
  flex-shrink: 0;
  background-color: var(--connection-label-color, transparent);
}
.connection-status {
  display: flex;
  gap: 0.5rem;
  padding: 0.2rem 0 0.2rem 2.4rem;
  font-size: 0.8rem;
  opacity: 0.7;
  &.error {
    opacity: 1;
  }
  .truncate {
    flex: 1 1 auto;
    min-width: 0;
  }
  .retry {
    cursor: pointer;
    text-decoration: underline;
    flex: 0 0 auto;
  }
}
</style>
