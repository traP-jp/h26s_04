<template>
  <SidebarContentContainerFoldable right-align title="All Messages">
    <template #header-control>
      <span
        v-if="!isMessageCountVisible"
        :class="$style.headerCount"
        :data-is-muted="$boolAttr(totalMessageCount === undefined || isFailed)"
      >
        {{ messageCountText }}
      </span>
      <span v-else :class="$style.headerCount">
        <ChannelSidebarAnimatedNumber :value="totalMessageCount ?? 0" />
      </span>
    </template>
    <p v-if="isFailed" :class="$style.status">Failed to load message count</p>
    <p
      v-else-if="userStats === undefined && isLoading"
      :class="$style.status"
      aria-busy="true"
    >
      Loading
    </p>
    <p v-else-if="userViewStates.length <= 0" :class="$style.status">
      No messages
    </p>
    <ol v-else :class="$style.list" aria-label="Message count by user">
      <li
        v-for="user in userViewStates"
        :key="user.id"
        :class="$style.item"
        :aria-label="`${user.name} ${user.messageCountText}`"
      >
        <span :class="$style.name" :title="user.name">{{ user.name }}</span>
        <span :class="$style.count">
          <ChannelSidebarAnimatedNumber :value="user.messageCount" />
        </span>
      </li>
    </ol>
  </SidebarContentContainerFoldable>
</template>

<script lang="ts" setup>
import type { ChannelStatsUser } from '@traptitech/traq'

import { computed } from 'vue'

import SidebarContentContainerFoldable from '/@/components/Main/MainView/PrimaryViewSidebar/SidebarContentContainerFoldable.vue'
import { useUsersStore } from '/@/store/entities/users'
import type { UserId } from '/@/types/entity-ids'

import ChannelSidebarAnimatedNumber from './ChannelSidebarAnimatedNumber.vue'

const props = defineProps<{
  totalMessageCount?: number
  userStats?: readonly ChannelStatsUser[]
  isLoading: boolean
  isFailed: boolean
}>()

const { usersMap } = useUsersStore()

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

const userViewStates = computed(() =>
  [...(props.userStats ?? [])]
    .filter(user => user.messageCount > 0)
    .sort((a, b) => b.messageCount - a.messageCount)
    .map(user => ({
      ...user,
      name: usersMap.value.get(user.id as UserId)?.name ?? 'unknown user',
      messageCountText: user.messageCount.toLocaleString()
    }))
)
</script>

<style lang="scss" module>
.headerCount {
  @include color-ui-primary;
  display: inline-flex;
  align-items: baseline;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;

  &[data-is-muted] {
    @include color-ui-tertiary;
    font-weight: 400;
  }
}

.status {
  @include color-ui-secondary;
  margin: 0;
  font-weight: 400;
  text-align: right;
  word-break: normal;
  overflow-wrap: break-word; // for Safari
  overflow-wrap: anywhere;
}

.list {
  position: relative;
  padding: 0;
  margin: 0;
  list-style: none;
}

.item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  column-gap: 6px;
  min-width: 0;
  margin-top: 2px;
}

.name {
  @include color-ui-secondary;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: right;
  white-space: nowrap;
}

.count {
  @include color-ui-primary;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

</style>
