<template>
  <SidebarContentContainer
    :title="title"
    title-clickable
    right-align
    @toggle="toggle"
  >
    <SlideDown :is-open="isOpen">
      <div v-if="isForceNotification" :class="$style.members">
        <div :class="$style.member">Force Notification</div>
      </div>
      <div v-else-if="members.length > 0" :class="$style.members">
        <div
          v-for="member in members"
          :key="member.id"
          :class="[member.inactive && $style.inactive, $style.member]"
        >
          {{ member.name }}
        </div>
      </div>
      <div v-else :class="$style.members">
        <div :class="$style.member">No Subscribers</div>
      </div>
    </SlideDown>
  </SidebarContentContainer>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

import SidebarContentContainer from '/@/components/Main/MainView/PrimaryViewSidebar/SidebarContentContainer.vue'
import SlideDown from '/@/components/UI/SlideDown.vue'
import useChannelSubscribers from '/@/composables/subscription/useChannelSubscribers'
import useToggle from '/@/composables/utils/useToggle'
import { isDefined } from '/@/lib/basic/array'
import { useChannelsStore } from '/@/store/entities/channels'
import { useUsersStore } from '/@/store/entities/users'
import type { ChannelId, UserId } from '/@/types/entity-ids'

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
const { usersMap } = useUsersStore()

const subscribers = useChannelSubscribers(props)
const { value: isOpen, toggle } = useToggle(false)

const isForceNotification = computed(
  () => channelsMap.value.get(props.channelId)?.force
)
const title = computed(() => `Subscribers: ${subscribers.value.size}`)
const members = computed(() =>
  [...subscribers.value]
    .map(id => usersMap.value.get(id))
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
.members {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.member {
  margin: 4px 0;
  font-weight: bold;
  text-align: right;
  word-break: normal;
  overflow-wrap: break-word; // for Safari
  overflow-wrap: anywhere;

  &:first-child {
    margin-top: 0;
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.inactive {
  opacity: 0.5;
}
</style>
