<template>
  <div :class="$style.overwrapContainer">
    <div :class="$style.container">
      <AIcon
        :class="$style.icon"
        mdi
        name="chevron-double"
        :size="28"
        @click="emit('open')"
      />
      <UserIconEllipsisList
        direction="col"
        transition="fade-bottom"
        count-clickable
        show-count
        :user-ids="viewerIds"
        :inactive-user-ids="inactiveViewerIds"
        :class="$style.rest"
        @count-click="emit('openViewers')"
      />
    </div>
    <ChannelSidebarHiddenCurrentViewers
      :viewer-ids="viewerIds"
      :inactive-viewer-ids="inactiveViewerIds"
    />

    <ChannelSidebarHiddenMember
      :channel-id="channelId"
      :viewer-ids="viewerIds"
    />
  </div>
</template>

<script lang="ts" setup>
import AIcon from '/@/components/UI/AIcon.vue'
import UserIconEllipsisList from '/@/components/UI/UserIconEllipsisList.vue'
import type { ChannelId, UserId } from '/@/types/entity-ids'

import ChannelSidebarHiddenCurrentViewers from './ChannelSidebarHiddenCurrentViewers.vue'
import ChannelSidebarHiddenMember from './ChannelSidebarHiddenMember.vue'

withDefaults(
  defineProps<{
    channelId: ChannelId
    viewerIds?: readonly UserId[]
    inactiveViewerIds?: readonly UserId[]
  }>(),
  {
    viewerIds: () => []
  }
)

const emit = defineEmits<{
  (e: 'open'): void
  (e: 'openViewers'): void
}>()
</script>

<style lang="scss" module>
.overwrapContainer {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-end;
}

.container {
  @include color-ui-primary;
  display: flex;
  flex-direction: column;
  width: 56px;
  height: 100%;
  align-items: center;
}

.icon {
  margin-bottom: 16px;
  margin-top: 16px;
  cursor: pointer;
  pointer-events: all;
  transition: transform 0.1s;
  &:hover {
    transform: scale(1.1);
  }
}
.rest {
  @include color-ui-secondary;
  pointer-events: all;
}
</style>
