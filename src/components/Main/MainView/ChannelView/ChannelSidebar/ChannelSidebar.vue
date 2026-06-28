<template>
  <PrimaryViewSidebar :is-sidebar-opener-ready="isSidebarOpenerReady">
    <template #page>
      <PrimaryViewSidebarPage v-if="page === 'default'">
        <template #header>
          <SidebarHeader icon-string="#" :channel-id="channelId" />
        </template>
        <template #content>
          <ChannelSidebarContent
            v-model:is-viewers-detail-open="isViewersDetailOpen"
            :channel-id="channelId"
            :viewer-ids="activeViewingUsers"
            :inactive-viewer-ids="inactiveViewingUsers"
            :pinned-messages-count="pinnedMessages.length"
          />
        </template>
      </PrimaryViewSidebarPage>
      <SidebarPinnedPage
        v-else-if="page === 'pinned'"
        :channel-id="channelId"
        :pinned-messages="pinnedMessages"
        @move-back="moveToDefaultPage"
      />
      <SidebarEventsPage
        v-else-if="page === 'events'"
        :channel-id="channelId"
        @move-back="moveToDefaultPage"
      />
    </template>
  </PrimaryViewSidebar>
</template>

<script lang="ts" setup>
import type { Pin } from '@traptitech/traq'

import PrimaryViewSidebar from '/@/components/Main/MainView/PrimaryViewSidebar/PrimaryViewSidebar.vue'
import PrimaryViewSidebarPage from '/@/components/Main/MainView/PrimaryViewSidebar/PrimaryViewSidebarPage.vue'
import SidebarEventsPage from '/@/components/Main/MainView/PrimaryViewSidebar/SidebarEventsPage.vue'
import SidebarHeader from '/@/components/Main/MainView/PrimaryViewSidebar/SidebarHeader.vue'
import SidebarPinnedPage from '/@/components/Main/MainView/PrimaryViewSidebar/SidebarPinnedPage.vue'
import useChannelSidebarCommon from '/@/components/Main/MainView/composables/useChannelSidebarCommon'
import useToggle from '/@/composables/utils/useToggle'
import { useChannelsStore } from '/@/store/entities/channels'
import type { ChannelId, UserId } from '/@/types/entity-ids'

import ChannelSidebarContent from './ChannelSidebarContent.vue'

defineProps<{
  channelId: ChannelId
  isSidebarOpenerReady: boolean
  pinnedMessages: Pin[]
  activeViewingUsers: UserId[]
  inactiveViewingUsers: UserId[]
}>()

useChannelsStore()
const { page, moveToDefaultPage } = useChannelSidebarCommon()

const { value: isViewersDetailOpen } = useToggle(false)
</script>
