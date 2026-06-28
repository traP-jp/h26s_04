<template>
  <PrimaryViewSidebarPage show-back-button @back="emit('moveBack')">
    <template #header>
      <SidebarHeader channel-id="channelId" />
    </template>
    <template #content>
      <SidebarPinnedList :pinned-messages="pinnedMessages" />
    </template>
  </PrimaryViewSidebarPage>
</template>

<script lang="ts" setup>
import type { Pin } from '@traptitech/traq'

import PrimaryViewSidebarPage from '/@/components/Main/MainView/PrimaryViewSidebar/PrimaryViewSidebarPage.vue'

import SidebarHeader from './SidebarHeader.vue'
import SidebarPinnedList from './SidebarPinned/SidebarPinnedList.vue'

withDefaults(
  defineProps<{
    pinnedMessages?: Pin[]
    channelId: string
  }>(),
  {
    pinnedMessages: () => []
  }
)

const emit = defineEmits<{
  (e: 'moveBack'): void
}>()
</script>
