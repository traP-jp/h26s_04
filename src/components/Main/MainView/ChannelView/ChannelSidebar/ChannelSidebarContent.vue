<template>
  <div>
    <ChannelSidebarViewers
      v-model="isViewersDetailOpen"
      :viewer-ids="viewerIds"
      :inactive-viewer-ids="inactiveViewerIds"
      :class="$style.sidebarItem"
    />
    <ChannelSidebarMessageCount
      :channel-id="channelId"
      :class="$style.sidebarItem"
    />
    <ChannelSidebarMember
      :channel-id="channelId"
      :class="$style.sidebarItem"
      :viewer-ids="viewerIds"
    />
    <ChannelSidebarBots :channel-id="channelId" :class="$style.sidebarItem" />
  </div>
</template>

<script lang="ts" setup>
import type { ChannelId, UserId } from '/@/types/entity-ids'

import ChannelSidebarBots from './ChannelSidebarBots.vue'
import ChannelSidebarMember from './ChannelSidebarMember.vue'
import ChannelSidebarMessageCount from './ChannelSidebarMessageCount.vue'
import ChannelSidebarViewers from './ChannelSidebarViewers.vue'

const isViewersDetailOpen = defineModel<boolean>('isViewersDetailOpen', {
  required: true
})

const props = withDefaults(
  defineProps<{
    channelId: ChannelId
    viewerIds: readonly UserId[]
    inactiveViewerIds: readonly UserId[]
    pinnedMessagesCount?: number
  }>(),
  {
    pinnedMessagesCount: 0
  }
)
</script>

<style lang="scss" module>
.sidebarItem {
  margin: 16px 0;
  &:first-child {
    margin-top: 0;
  }
  &:last-child {
    margin-bottom: 0;
  }
  background: transparent;
}

.edit {
  margin: 24px 0;
  flex: 1;
  align-items: flex-end;
}
</style>
