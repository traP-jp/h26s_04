<template>
    <div :class="$style.stats">
        Subscribers:
        <div v-if="isForceNotification"> 強制通知チャンネル </div>
        <div v-else-if="!subscribers">
            メンバーの取得に失敗しました
        </div>
        <ChannelSidebarMemberIcons
            v-else-if="subscribers.size > 0"
            :viewer-states="viewStates"
        />
        <div v-else> No Subscribers</div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

import useChannelSubscribers from '/@/composables/subscription/useChannelSubscribers'
import { isDefined } from '/@/lib/basic/array'
import { useChannelsStore } from '/@/store/entities/channels'
import { useUsersStore } from '/@/store/entities/users'
import type { ChannelId, UserId } from '/@/types/entity-ids'

import ChannelSidebarMemberIcons from './ChannelSidebarMemberIcons.vue'

const props = withDefaults(
  defineProps<{
    channelId: ChannelId
    viewerIds?: readonly UserId[]
  }>(),
  {
    viewerIds: () => []
  }
)
const { channelsMap } = useChannelsStore()
const { activeUsersMap } = useUsersStore()

const subscribers = useChannelSubscribers(props)

const isForceNotification = computed(
  () => channelsMap.value.get(props.channelId)?.force
)
const viewStates = computed(() =>
  [...subscribers.value]
    .map(id => activeUsersMap.value.get(id))
    .filter(isDefined)
    .map(user => ({ ...user, inactive: !props.viewerIds.includes(user.id) }))
    .sort((a, b) => {
      if (a.inactive === b.inactive) {
        return 0
      }
      return a.inactive ? 1 : -1
    })
)
</script>

<style lang="scss" module>
    .stats {
    @include color-ui-tertiary;
    white-space: nowrap;
    text-align: right;
    margin-right: 16px;
    }
</style>
