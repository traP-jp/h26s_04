<template>
  <SidebarContentContainer right-align title="All Messages: ">
    <div :class="$style.content">
      <span
        v-if="!isMessageCountVisible"
        :class="$style.count"
        :data-is-muted="$boolAttr(totalMessageCount === undefined || isFailed)"
      >
        {{ messageCountText }}
      </span>
      <span v-else :class="$style.count">
        <ChannelSidebarAnimatedNumber :value="totalMessageCount ?? 0" />
      </span>
    </div>
  </SidebarContentContainer>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

import SidebarContentContainer from '/@/components/Main/MainView/PrimaryViewSidebar/SidebarContentContainer.vue'

import ChannelSidebarAnimatedNumber from './ChannelSidebarAnimatedNumber.vue'

const props = defineProps<{
  totalMessageCount?: number
  isLoading: boolean
  isFailed: boolean
}>()

const isMessageCountVisible = computed(
  () => !props.isFailed && props.totalMessageCount !== undefined
)

const messageCountText = computed(() => {
  if (props.isFailed) return 'error'
  if (props.totalMessageCount === undefined) {
    return props.isLoading ? 'loading' : '-'
  }

  return props.totalMessageCount.toLocaleString()
})
</script>

<style lang="scss" module>
.content {
  display: flex;
  align-items: baseline;
}

.count {
  @include color-ui-primary;
  display: inline-flex;
  align-items: baseline;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;

  &[data-is-muted] {
    @include color-ui-tertiary;
    font-weight: normal;
  }
}
</style>
