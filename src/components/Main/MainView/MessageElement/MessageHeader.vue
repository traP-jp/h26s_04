<template>
  <div :class="$style.header">
    <span :class="$style.displayName">{{
      user?.displayName ?? 'unknown'
    }}</span>
    <GradeBadge
      :class="$style.badge"
      :user-id="userId"
      :is-bot="user?.bot ?? false"
    />
    <div :class="$style.name">@{{ user?.name ?? 'unknown' }}</div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

import { useUsersStore } from '/@/store/entities/users'
import type { UserId } from '/@/types/entity-ids'

import GradeBadge from './GradeBadge.vue'

const props = defineProps<{
  userId: UserId
}>()

const { usersMap, fetchUser } = useUsersStore()

const user = computed(() => usersMap.value.get(props.userId))
if (user.value === undefined) {
  fetchUser({ userId: props.userId })
}
</script>

<style lang="scss" module>
.header {
  display: block;
  min-width: 0;
}

.displayName {
  font-weight: bold;
  flex: 2;
  max-width: min-content;

  word-break: keep-all;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.badge {
  margin-left: 4px;
}

.name {
  @include color-ui-secondary;
  @include size-body2;
  margin-left: 4px;
  flex: 1;
  max-width: min-content;

  word-break: keep-all;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
</style>
