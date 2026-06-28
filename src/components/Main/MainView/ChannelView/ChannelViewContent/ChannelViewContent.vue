<template>
  <div :class="$style.container">
    <ChannelViewContentMain
      :key="renderKey"
      :channel-id="channelId"
      :entry-message-id="entryMessageId"
      :pinned-messages="pinnedMessages"
    />
  </div>
</template>

<script lang="ts" setup>
import type { Pin } from '@traptitech/traq'

import { useRenderKey } from '/@/composables/dom/useRenderKey'
import type { ChannelId } from '/@/types/entity-ids'

import ChannelViewContentMain from './ChannelViewContentMain.vue'

const { key: renderKey } = useRenderKey('messages')

defineProps<{
  channelId: ChannelId
  entryMessageId?: ChannelId
  pinnedMessages: Pin[]
}>()
</script>

<style lang="scss" module>
.container {
  @include color-ui-primary;
  display: flex;
  flex-direction: row;
  position: relative;
  height: 100%;
  // 背景を透明にして、後ろの星空（StarfieldScene）が透けて見えるようにする
  background: transparent;
}

.header {
  font: {
    size: 30px;
    weight: bold;
  }
}
</style>
