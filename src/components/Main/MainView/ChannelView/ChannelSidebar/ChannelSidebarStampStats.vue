<template>
  <SidebarContentContainer title="Stamp Statistics" right-align>
    <EmptyState v-if="isFailed"> Failed to load stamp statistics </EmptyState>
    <EmptyState v-else-if="stampStats === undefined && isLoading">
      Loading
    </EmptyState>
    <EmptyState v-else-if="totalStampCount === 0"> No stamps </EmptyState>
    <div v-else :class="$style.content">
      <p :class="$style.total">Total: {{ totalStampCountText }}</p>
      <ol :class="$style.list" aria-label="Most used stamps">
        <li
          v-for="stamp in topStampViewStates"
          :key="stamp.id"
          :class="$style.item"
          :aria-label="`${stamp.name} ${stamp.totalText}`"
        >
          <span :class="$style.name" :title="stamp.displayName">
            {{ stamp.displayName }}
          </span>
          <span :class="$style.count">{{ stamp.totalText }}</span>
        </li>
      </ol>
    </div>
  </SidebarContentContainer>
</template>

<script lang="ts" setup>
import type { ChannelStatsStamp } from '@traptitech/traq'

import { computed } from 'vue'

import SidebarContentContainer from '/@/components/Main/MainView/PrimaryViewSidebar/SidebarContentContainer.vue'
import EmptyState from '/@/components/UI/EmptyState.vue'
import { useStampsStore } from '/@/store/entities/stamps'

const props = defineProps<{
  stampStats?: readonly ChannelStatsStamp[]
  isLoading: boolean
  isFailed: boolean
}>()

const { stampsMap } = useStampsStore()

const stampViewStates = computed(() =>
  [...(props.stampStats ?? [])]
    .filter(stamp => stamp.total > 0)
    .sort((a, b) => b.total - a.total || b.count - a.count)
    .map(stamp => ({
      ...stamp,
      name: stampsMap.value.get(stamp.id)?.name ?? 'unknown stamp',
      totalText: stamp.total.toLocaleString()
    }))
)

const totalStampCount = computed(() =>
  stampViewStates.value.reduce((sum, stamp) => sum + stamp.total, 0)
)
const totalStampCountText = computed(() =>
  totalStampCount.value.toLocaleString()
)
const topStampViewStates = computed(() => {
  return stampViewStates.value.slice(0, 3).map(stamp => ({
    ...stamp,
    displayName: stamp.name
  }))
})
</script>

<style lang="scss" module>
.content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  text-align: right;
}

.total {
  @include color-ui-primary;
  margin: 0;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
}

.list {
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
  margin-top: 4px;
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
</style>
