<template>
  <div
    :data-is-large-padding="$boolAttr(largePadding)"
    :data-is-clickable="$boolAttr(clickable)"
    :class="$style.container"
    @click.self="onContainerClick"
  >
    <div
      v-if="title"
      :class="[$style.header, rightAlign && $style.headerRightAlign]"
      :data-is-clickable="$boolAttr(titleClickable)"
      @click="emit('toggle')"
    >
      <h2
        :class="[
          $style.headerTitle,
          rightAlign && $style.headerTitleRightAlign
        ]"
      >
        {{ title }}
      </h2>
      <slot name="header-control" />
    </div>
    <div :class="[$style.slot, rightAlign && $style.rightAlign]">
      <slot />
    </div>
  </div>
</template>

<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    title?: string
    largePadding?: boolean
    clickable?: boolean
    titleClickable?: boolean
    rightAlign?: boolean
  }>(),
  {
    largePadding: false,
    clickable: false,
    titleClickable: false,
    rightAlign: false
  }
)

const emit = defineEmits<{
  (e: 'toggle'): void
}>()

const onContainerClick = () => {
  if (props.clickable) {
    emit('toggle')
  }
}
</script>

<style lang="scss" module>
.container {
  background: transparent;
  @include color-ui-secondary;
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 12px;
  border-radius: 4px;
  flex-shrink: 0;
  &[data-is-clickable] {
    cursor: pointer;
  }
  &[data-is-large-padding] {
    padding: 16px;
  }
  background-color: transparent;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  &[data-is-clickable] {
    cursor: pointer;
  }
  &:last-child {
    // 折り畳み時の見た目調整
    margin-bottom: 0;
  }
  background-color: transparent;
}

.headerTitle {
  @include size-body1;
  font-weight: bold;
}

.headerRightAlign {
  justify-content: flex-end;
}

.headerTitleRightAlign {
  text-align: right;
}

.slot {
  display: flex;
  flex-direction: column;
}

.rightAlign {
  align-items: flex-end;
}
</style>
