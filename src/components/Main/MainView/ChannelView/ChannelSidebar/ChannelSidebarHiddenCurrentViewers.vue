<template>
  <div :class="$style.stats">
    <span>Current Active Viewers: {{ props.viewerIds.length }}</span
    ><br />
    <span>Current Inactive Viewers: {{ props.inactiveViewerIds.length }}</span>
  </div>
</template>

<script setup lang="ts">
import type { UserId } from '/@/types/entity-ids'

const props = withDefaults(
  defineProps<{
    viewerIds?: readonly UserId[]
    inactiveViewerIds?: readonly UserId[]
  }>(),
  {
    viewerIds: () => [],
    inactiveViewerIds: () => []
  }
)
</script>

<style lang="scss" module>
.stats {
  @include color-ui-tertiary;
  white-space: nowrap;
  text-align: right;
  margin-right: 16px;
}
.item {
  display: flex;
  align-items: center;
  margin: 4px 0;
  &:first-child {
    margin-top: 0;
  }
  &:last-child {
    margin-bottom: 0;
  }
}
</style>
