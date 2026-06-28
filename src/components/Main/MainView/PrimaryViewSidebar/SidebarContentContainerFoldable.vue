<template>
  <SidebarContentContainer
    :title="title"
    :clickable="!isOpenValue"
    title-clickable
    :large-padding="largePadding"
    :right-align="rightAlign"
    @toggle="toggle"
  >
    <template #header-control>
      <span :class="$style.headerControl" @click.stop="toggle">
        <slot name="header-control" />
        <span
          :class="$style.foldIcon"
          :data-is-open="$boolAttr(isOpenValue)"
          aria-hidden="true"
        >
          <span :class="$style.foldDot" />
        </span>
      </span>
    </template>
    <template #default>
      <SlideDown :is-open="isOpenValue">
        <slot />
      </SlideDown>
    </template>
  </SidebarContentContainer>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'

import SidebarContentContainer from '/@/components/Main/MainView/PrimaryViewSidebar/SidebarContentContainer.vue'
import SlideDown from '/@/components/UI/SlideDown.vue'

const props = withDefaults(
  defineProps<{
    title?: string
    largePadding?: boolean
    rightAlign?: boolean
    defaultOpen?: boolean
    isOpen?: boolean
  }>(),
  {
    largePadding: false,
    rightAlign: false,
    defaultOpen: false,
    isOpen: undefined
  }
)

const localIsOpen = ref(props.defaultOpen)

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
}>()

const isOpenValue = computed<boolean>({
  get: () => props.isOpen ?? localIsOpen.value,
  set: value => {
    localIsOpen.value = value
    emit('update:isOpen', value)
  }
})

const toggle = () => {
  isOpenValue.value = !isOpenValue.value
}
</script>

<style lang="scss" module>
.headerControl {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.foldIcon {
  @include color-ui-primary;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  box-sizing: border-box;
  border: 2px solid $theme-ui-primary-default;
  border-radius: 3px;
  transition:
    background-color 0.12s ease,
    border-color 0.12s ease,
    color 0.12s ease;

  &[data-is-open] {
    color: var(--specific-channel-hash-opened);
    border-color: transparent;
    background: $theme-ui-primary-background;
  }
}

.foldDot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
}
</style>
