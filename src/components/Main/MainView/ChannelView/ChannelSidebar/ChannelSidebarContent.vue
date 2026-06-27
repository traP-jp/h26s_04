<template>
  <div>
    <ChannelSidebarViewers
      v-model="isViewersDetailOpen"
      :viewer-ids="viewerIds"
      :inactive-viewer-ids="inactiveViewerIds"
      :class="$style.sidebarItem"
    />
    <!-- <ChannelSidebarQall
      v-if="qallUserIds.length > 0"
      :qall-user-ids="qallUserIds"
      :class="$style.sidebarItem"
    />
    <ChannelSidebarTopic :class="$style.sidebarItem" :channel-id="channelId" />
    <ChannelSidebarMessageCount
      :channel-id="channelId"
      :class="$style.sidebarItem"
    />
    <ChannelSidebarPinned
      :pinned-message-length="pinnedMessagesCount"
      :class="$style.sidebarItem"
      @click-link="emit('moveToPinned')"
    />
    <ChannelSidebarEvents
      :class="$style.sidebarItem"
      @click-link="emit('moveToEvents')"
    />
    <ChannelSidebarRelation
      :channel-id="channelId"
      :class="$style.sidebarItem"
    /> -->
    <ChannelSidebarMember
      :channel-id="channelId"
      :class="$style.sidebarItem"
      :viewer-ids="viewerIds"
    />
    <ChannelSidebarBots :channel-id="channelId" :class="$style.sidebarItem" />
    <!--
    <channel-sidebar-edit :class="$style.edit" />
    -->
  </div>
</template>

<script lang="ts" setup>
// import { computed } from 'vue'

// import { useQall } from '/@/composables/qall/useQall'
import type { ChannelId, UserId } from '/@/types/entity-ids'

import ChannelSidebarBots from './ChannelSidebarBots.vue'
import ChannelSidebarMember from './ChannelSidebarMember.vue'
<<<<<<< HEAD
import ChannelSidebarViewers from './ChannelSidebarViewers.vue'
/* import ChannelSidebarEvents from './ChannelSidebarEvents.vue'
=======
import ChannelSidebarMessageCount from './ChannelSidebarMessageCount.vue'
>>>>>>> origin/master
import ChannelSidebarPinned from './ChannelSidebarPinned.vue'
import ChannelSidebarQall from './ChannelSidebarQall.vue'
import ChannelSidebarRelation from './ChannelSidebarRelation.vue'
import ChannelSidebarTopic from './ChannelSidebarTopic.vue'
 */
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

/* const emit = defineEmits<{
  (e: 'moveToPinned'): void
  (e: 'moveToEvents'): void
}>()

const { rooms: roomWithParticipants } = useQall()

const qallUserIds = computed(
  () =>
    roomWithParticipants.value
      .find(room => room.channel.id === props.channelId)
      ?.participants?.map(participant => participant.user.id) ?? []
) */
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
