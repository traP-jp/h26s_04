<template>
  <SidebarContentContainer title="総メッセージ数">
    <div :class="$style.content">
      <span
        :class="$style.count"
        :data-is-muted="$boolAttr(totalMessageCount === undefined || isFailed)"
      >
        {{ messageCountText }}
      </span>
    </div>
  </SidebarContentContainer>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

import SidebarContentContainer from '/@/components/Main/MainView/PrimaryViewSidebar/SidebarContentContainer.vue'
import type { ChannelId } from '/@/types/entity-ids'

import useChannelMessageCount from './composables/useChannelMessageCount'

const props = defineProps<{
  channelId: ChannelId
}>()

const { totalMessageCount, isLoading, isFailed } =
  useChannelMessageCount(props)

const messageCountText = computed(() => {
  if (isFailed.value) return 'error'
  if (totalMessageCount.value === undefined) {
    return isLoading.value ? 'loading' : '-'
  }

  return totalMessageCount.value.toLocaleString()
})
</script>

<style lang="scss" module>
.content {
  display: flex;
  align-items: baseline;
}

.count {
  @include color-ui-primary;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;

  &[data-is-muted] {
    @include color-ui-tertiary;
    font-weight: normal;
  }
}
</style>
