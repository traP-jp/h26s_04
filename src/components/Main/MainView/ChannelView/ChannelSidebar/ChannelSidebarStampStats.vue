<template>
  <SidebarContentContainerFoldable title="Stamp Statistics" right-align>
    <template #header-control>
      <span
        v-if="!isTotalStampCountVisible"
        :class="$style.headerTotal"
        :data-is-muted="$boolAttr(stampStats === undefined || isFailed)"
      >
        {{ totalStampCountText }}
      </span>
      <span v-else :class="$style.headerTotal">
        Total:
        <ChannelSidebarAnimatedNumber :value="totalStampCount" />
      </span>
    </template>
    <p v-if="isFailed" :class="$style.status">
      Failed to load stamp statistics
    </p>
    <p
      v-else-if="stampStats === undefined && isLoading"
      :class="$style.status"
      aria-busy="true"
    >
      Loading
    </p>
    <p v-else-if="totalStampCount === 0" :class="$style.status">No stamps</p>
    <div v-else :class="$style.content">
      <transition-group
        :class="$style.list"
        name="stamp-rank"
        tag="ol"
        aria-label="Most used stamps"
      >
        <li
          v-for="stamp in stampViewStates"
          :key="stamp.id"
          :class="$style.item"
          :aria-label="`${stamp.name} ${stamp.countText}`"
        >
          <span :class="$style.name" :title="stamp.displayName">
            {{ stamp.displayName }}
          </span>
          <span :class="$style.count">
            <ChannelSidebarAnimatedNumber :value="stamp.count" />
          </span>
        </li>
      </transition-group>
    </div>
  </SidebarContentContainerFoldable>
</template>

<script lang="ts" setup>
import type { ChannelStatsStamp } from '@traptitech/traq'

import { computed } from 'vue'

import SidebarContentContainerFoldable from '/@/components/Main/MainView/PrimaryViewSidebar/SidebarContentContainerFoldable.vue'
import { useStampsStore } from '/@/store/entities/stamps'

import ChannelSidebarAnimatedNumber from './ChannelSidebarAnimatedNumber.vue'

const props = defineProps<{
  stampStats?: readonly ChannelStatsStamp[]
  isLoading: boolean
  isFailed: boolean
}>()

const { stampsMap } = useStampsStore()

const stampViewStates = computed(() =>
  [...(props.stampStats ?? [])]
    .filter(stamp => stamp.count > 0)
    .sort((a, b) => b.count - a.count || b.total - a.total)
    .map(stamp => {
      const name = stampsMap.value.get(stamp.id)?.name ?? 'unknown stamp'
      return {
        ...stamp,
        name,
        displayName: name,
        countText: stamp.count.toLocaleString()
      }
    })
)

const totalStampCount = computed(() =>
  stampViewStates.value.reduce((sum, stamp) => sum + stamp.total, 0)
)
const isTotalStampCountVisible = computed(
  () => !props.isFailed && props.stampStats !== undefined
)
const totalStampCountText = computed(() => {
  if (props.isFailed) return 'error'
  if (props.stampStats === undefined) {
    return props.isLoading ? 'loading' : '-'
  }

  return `Total: ${totalStampCount.value.toLocaleString()}`
})
</script>

<style lang="scss" module>
.headerTotal {
  @include color-ui-primary;
  display: inline-flex;
  align-items: baseline;
  gap: 0.25em;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;

  &[data-is-muted] {
    @include color-ui-tertiary;
    font-weight: 400;
  }
}

.content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  text-align: right;
}

.status {
  @include color-ui-secondary;
  margin: 0;
  font-weight: 400;
  text-align: right;
  word-break: normal;
  overflow-wrap: break-word; // for Safari
  overflow-wrap: anywhere;
}

.list {
  position: relative;
  padding: 0;
  margin: 0;
  list-style: none;
}

.item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  column-gap: 6px;
  min-width: 0;
  margin-top: 2px;
}

.name {
  @include color-ui-secondary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.count {
  @include color-ui-primary;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

:global(.stamp-rank-move),
:global(.stamp-rank-enter-active),
:global(.stamp-rank-leave-active) {
  transition:
    transform 140ms ease-out,
    opacity 100ms ease-out;
}

:global(.stamp-rank-enter-from),
:global(.stamp-rank-leave-to) {
  opacity: 0;
  transform: translateY(0.4em);
}

:global(.stamp-rank-leave-active) {
  position: absolute;
  right: 0;
  left: 0;
}

@media (prefers-reduced-motion: reduce) {
  :global(.stamp-rank-move),
  :global(.stamp-rank-enter-active),
  :global(.stamp-rank-leave-active) {
    transition: none;
  }
}
</style>
