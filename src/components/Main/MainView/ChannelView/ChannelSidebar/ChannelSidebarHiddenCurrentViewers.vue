<template>
	<div :class="$style.stats">
		<span>Current Active Viewers: {{ viewerIds.length }}</span><br>
		<!-- <div v-for="user in viewers" :key="user.id">
      <div>
              {{ user.displayName }}
      </div>
    </div> -->
    <span>Current Inactive Viewers: {{ inactiveViewerIds.length }}</span>
    <!-- <div
      v-for="user in inactiveUsers"
      :key="user.id"
    >
      <div>
        {{ user.displayName }}
      </div>
    </div> -->
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { UserId } from '/@/types/entity-ids';
import { useUsersStore } from '/@/store/entities/users';
import { isDefined } from '@vueuse/core';

const props = withDefaults(
  defineProps<{
    viewerIds?: readonly UserId[]
    inactiveViewerIds?: readonly UserId[]
  }>(),
  {
    viewerIds: () => [],
    inactiveViewerIds: () => []
  }
)

const { usersMap } = useUsersStore()
const viewers = computed(() =>
  props.viewerIds.map((id) => usersMap.value.get(id)).filter(isDefined)
)
const inactiveUsers = computed(() =>
  props.inactiveViewerIds.map((id) => usersMap.value.get(id)).filter(isDefined)
)
</script>

<style lang="scss" module>
.stats {
	@include color-ui-tertiary;
	white-space: nowrap;
	text-align: right;
	margin-right: 16px;
}
.item {
  display: flex;
  align-items: center;
  margin: 4px 0;
  &:first-child {
    margin-top: 0;
  }
  &:last-child {
    margin-bottom: 0;
  }
}
</style>
