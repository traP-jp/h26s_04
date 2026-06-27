<template>
  <component
    :is="hasChild ? 'button' : 'div'"
    :class="$style.container"
    :aria-label="
      hasChild && !isOpened
        ? 'チャンネルツリーを展開'
        : hasChild && isOpened
          ? 'チャンネルツリーを閉じる'
          : undefined
    "
    @mousedown.stop="onChannelIconClick"
    @keydown.enter="onChannelIconKeydownEnter"
    @mouseenter="onIconHovered"
    @mouseleave="onIconHoveredLeave"
  >
    <div
      :class="$style.channelIconWrapper"
      :data-container-type="hasChild ? 'parent' : 'leaf'"
      :data-is-opened="$boolAttr(hasChild && isOpened)"
      :data-is-selected="$boolAttr(isSelected)"
      :data-has-notification-on-child="$boolAttr(hasNotificationOnChild)"
      :data-is-inactive="$boolAttr(isInactive)"
    >
      <span
        v-if="iconName === 'hash'"
        :class="$style.channelDot"
        :data-has-notification="$boolAttr(hasNotification)"
      />
      <AIcon
        v-if="iconName !== 'hash'"
        :name="iconName"
        :class="$style.icon"
        :mdi="$props.isIconMdi"
        :size="iconSize"
      />
    </div>
    <div
      v-if="hasNotification && iconName !== 'hash'"
      :class="$style.indicator"
    >
      <NotificationIndicator :border-width="2" />
    </div>
  </component>
</template>

<script lang="ts" setup>
import AIcon from '/@/components/UI/AIcon.vue'
import NotificationIndicator from '/@/components/UI/NotificationIndicator.vue'

const props = withDefaults(
  defineProps<{
    hasChild?: boolean
    isSelected?: boolean
    isInactive?: boolean
    isOpened?: boolean
    isIconMdi?: boolean
    hasNotification?: boolean
    hasNotificationOnChild?: boolean
    iconName?: 'hash' | 'star-outline' | 'notified' | 'archive'
    iconSize?: number
  }>(),
  {
    hasChild: false,
    isSelected: false,
    isInactive: false,
    isOpened: false,
    isIconMdi: false,
    hasNotification: false,
    hasNotificationOnChild: false,
    iconName: 'hash'
  }
)

const emit = defineEmits<{
  (e: 'click', event: KeyboardEvent | MouseEvent): void
  (e: 'mouseenter'): void
  (e: 'mouseleave'): void
}>()

const onChannelIconKeydownEnter = (e: KeyboardEvent) => {
  if (props.hasChild) {
    emit('click', e)
  }
}
const onChannelIconClick = (e: MouseEvent) => {
  emit('click', e)
}

const onIconHovered = () => {
  emit('mouseenter')
}
const onIconHoveredLeave = () => {
  emit('mouseleave')
}
</script>

<style lang="scss" module>
.container {
  appearance: none;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  font: inherit;
  position: relative;
  width: 26px;
  height: 26px;

  &:focus {
    outline: none;
  }
  &:focus-visible .channelIconWrapper {
    outline: 2px solid currentColor;
    outline-offset: 1px;
  }
}
.channelIconWrapper {
  border: {
    width: 2px;
    style: solid;
    color: transparent;
  }
  border-radius: 3px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  cursor: pointer;
  position: relative;

  &[data-container-type='leaf'] {
    @include color-ui-primary;
    &[data-is-inactive] {
      @include color-ui-secondary;
      border-color: $theme-ui-secondary-default;
    }
    &[data-is-selected] {
      @include color-accent-primary;
    }
  }
  &[data-container-type='parent'] {
    transition:
      background-color 0.12s ease,
      border-color 0.12s ease;

    &[data-is-opened] {
      color: var(--specific-channel-hash-opened);
      background: $theme-ui-primary-background;
      &[data-is-inactive] {
        background: $theme-ui-secondary-background;
      }
      &[data-is-selected] {
        @include background-accent-primary;
      }
    }
    &:not([data-is-opened]) {
      @include color-ui-primary;
      border-color: $theme-ui-primary-default;
      &:hover,
      .container:focus-visible & {
        background: $theme-ui-primary-background;
      }
      &[data-is-inactive] {
        @include color-ui-secondary;
        border-color: $theme-ui-secondary-default;
        &:hover,
        .container:focus-visible & {
          background: $theme-ui-secondary-background;
        }
      }
      &[data-has-notification-on-child] {
        border-color: $theme-accent-notification-default;
        &:hover,
        .container:focus-visible & {
          background: $theme-accent-notification-background;
        }
      }
      &[data-is-selected] {
        @include color-accent-primary;
        border-color: $theme-accent-primary-default;
        &:hover,
        .container:focus-visible & {
          @include background-accent-primary;
        }
      }
    }
  }
}
.indicator {
  position: absolute;
  top: 0;
  right: 0;
}
.channelDot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  // opacity: 1;
  flex-shrink: 0;
  transition:
    background-color 0.12s ease,
    opacity 0.12s ease,
    transform 0.12s ease;

  &[data-has-notification] {
    background: $theme-accent-notification-default;
    opacity: 1;
    transform: scale(1.08);
  }
  .channelIconWrapper[data-is-inactive] &:not([data-has-notification]) {
    opacity: 0.28;
  }
}
.icon {
  margin-left: 0;
}
</style>
