<template>
  <div :class="$style.container">
    <SidebarContentContainerFoldable
      v-model:is-open="isActiveOpen"
      :class="$style.section"
      large-padding
      right-align
      :title="`Active: ${viewerIds.length}`"
    >
      <div :class="$style.viewers">
        <div v-for="user in viewers" :key="user.id" :class="$style.viewer">
          {{ user.displayName }}
        </div>
        <div v-if="viewers.length <= 0" :class="[$style.viewer, $style.empty]">
          No Active Viewers
        </div>
      </div>
    </SidebarContentContainerFoldable>

    <SidebarContentContainerFoldable
      v-model:is-open="isInactiveOpen"
      :class="$style.section"
      large-padding
      right-align
      :title="`Inactive: ${inactiveViewerIds.length}`"
    >
      <div :class="$style.viewers">
        <div
          v-for="user in inactiveUsers"
          :key="user.id"
          :class="[$style.viewer, $style.inactive]"
        >
          {{ user.displayName }}
        </div>
        <div
          v-if="inactiveUsers.length <= 0"
          :class="[$style.viewer, $style.empty]"
        >
          No Inactive Viewers
        </div>
      </div>
    </SidebarContentContainerFoldable>
  </div>
</template>

<script lang="ts" setup>
import { computed, onUnmounted, ref, watch } from 'vue'

import SidebarContentContainerFoldable from '/@/components/Main/MainView/PrimaryViewSidebar/SidebarContentContainerFoldable.vue'
import { isDefined } from '/@/lib/basic/array'
import { useUsersStore } from '/@/store/entities/users'
import type { UserId } from '/@/types/entity-ids'

const modelValue = defineModel<boolean>({ required: true })
const isActiveOpen = ref(false)
const isInactiveOpen = ref(false)

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
  props.viewerIds.map(id => usersMap.value.get(id)).filter(isDefined)
)
const inactiveUsers = computed(() =>
  props.inactiveViewerIds.map(id => usersMap.value.get(id)).filter(isDefined)
)

watch([isActiveOpen, isInactiveOpen], ([activeOpen, inactiveOpen]) => {
  modelValue.value = activeOpen || inactiveOpen
})
watch(modelValue, value => {
  if (value === false) {
    isActiveOpen.value = false
    isInactiveOpen.value = false
  }
})

onUnmounted(() => {
  modelValue.value = false
})
</script>

<style lang="scss" module>
.container {
  display: flex;
  flex-direction: column;
}

.section {
  margin: 4px 0;

  &:first-child {
    margin-top: 0;
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.viewers {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.viewer {
  margin: 2px 0;
  text-align: right;
  word-break: normal;
  overflow-wrap: break-word; // for Safari
  overflow-wrap: anywhere;
}

.inactive,
.empty {
  opacity: 0.5;
}
</style>
