<template>
  <PrimaryViewFrame :is-ready="isReady">
    <template #default>
      <ClipsViewContent :clip-folder-id="clipFolderId" />
    </template>
    <template #sidebar>
      <ClipsSidebar
        :clip-folder-id="clipFolderId"
        :is-sidebar-opener-ready="isReady"
      />
    </template>
  </PrimaryViewFrame>
</template>

<script lang="ts" setup>
import type { ClipFolderId } from '/@/types/entity-ids'

import PrimaryViewFrame from '../PrimaryViewFrame.vue'
import ClipsSidebar from './ClipsSidebar/ClipsSidebar.vue'
import ClipsViewContent from './ClipsViewContent/ClipsViewContent.vue'

defineProps<{
  isReady: boolean
  clipFolderId: ClipFolderId
}>()
</script>
