<template>
  <div
    :class="$style.container"
    :data-is-selected="$boolAttr(isSelected)"
    :data-is-inactive="$boolAttr(!channel.active)"
  >
    <!-- チャンネル表示本体 -->
    <div
      :class="$style.channelContainer"
      :data-is-topic-shown="$boolAttr(showTopic)"
    >
      <ChannelElementIcon
        :class="$style.channelIcon"
        :has-child="hasChildren"
        :is-selected="isSelected"
        :is-opened="isOpened"
        :has-notification="notificationState.hasNotification"
        :has-notification-on-child="notificationState.hasNotificationOnChild"
        :is-inactive="!channel.active"
        :icon-name="iconName"
        :is-icon-mdi="isIconMdi"
        :icon-size="iconSize"
        @click.stop="onClickIcon"
        @mouseenter="onIconHovered"
        @mouseleave="onIconHoveredLeave"
      />
      <router-link
        v-slot="{ href, navigate }"
        custom
        :to="channelIdToLink(props.channel.id) ?? ''"
      >
        <a
          :class="$style.channel"
          :href="href"
          :aria-current="isSelected && 'page'"
          :aria-expanded="hasChildren && isOpened ? true : undefined"
          :data-is-inactive="$boolAttr(!channel.active)"
          :aria-label="
            showShortenedPath ? pathTooltip : (pathToShow ?? undefined)
          "
          draggable="false"
          @click="navigate"
          @mouseenter="onMouseEnter"
          @mouseleave="onMouseLeave"
          @focus="onFocus"
          @blur="onBlur"
        >
          <ChannelElementName
            :channel="channel"
            :show-shortened-path="showShortenedPath"
            :is-selected="isSelected"
          />
          <ChannelElementUnreadBadge
            :is-noticeable="notificationState.isNoticeable"
            :unread-count="notificationState.unreadCount"
          />
        </a>
      </router-link>
    </div>

    <div :class="$style.slot">
      <ChannelElementTopic v-if="showTopic" :channel-id="channel.id" />
      <slot />
    </div>

    <!-- チャンネルの背景 -->
    <div
      v-if="isSelected || isChannelBgHovered || isFocused"
      :class="$style.selectedBg"
      :data-is-hovered="$boolAttr(isChannelBgHovered)"
      :data-is-focused="$boolAttr(isFocused)"
    />
  </div>
</template>

<script lang="ts" setup>
import { ChannelSubscribeLevel } from '@traptitech/traq'

import { computed, toRef } from 'vue'

import {
  type TypedProps,
  usePath
} from '/@/components/Main/NavigationBar/ChannelList/composables/usePath'
import useFocus from '/@/composables/dom/useFocus'
import useHover from '/@/composables/dom/useHover'
import useChannelPath from '/@/composables/useChannelPath'
import { useOpenLink } from '/@/composables/useOpenLink'
import type { ChannelTreeNode } from '/@/lib/channelTree'
import { LEFT_CLICK_BUTTON } from '/@/lib/dom/event'
import { useMainViewStore } from '/@/store/ui/mainView'
import type { ChannelId } from '/@/types/entity-ids'

import useNotificationState from '../composables/useNotificationState'
import ChannelElementIcon from './ChannelElementIcon.vue'
import ChannelElementName from './ChannelElementName.vue'
import ChannelElementTopic from './ChannelElementTopic.vue'
import ChannelElementUnreadBadge from './ChannelElementUnreadBadge.vue'

const props = withDefaults(
  defineProps<{
    channel: ChannelTreeNode
    isOpened?: boolean
    showShortenedPath?: boolean
    showTopic?: boolean
    showStar?: boolean
    showNotified?: boolean
  }>(),
  {
    isOpened: false,
    showShortenedPath: false,
    showTopic: false
  }
)

const emit = defineEmits<{
  (e: 'clickHash', channelId: ChannelId): void
}>()

const { primaryView } = useMainViewStore()

const hasChildren = computed(() => props.channel.children.length > 0)
const isSelected = computed(
  () =>
    primaryView.value.type === 'channel' &&
    props.channel.id === primaryView.value.channelId
)

const onClickIcon = (e: KeyboardEvent | MouseEvent) => {
  if (
    e instanceof MouseEvent &&
    (!hasChildren.value || e.button !== LEFT_CLICK_BUTTON)
  ) {
    openChannel(e)
    return
  }
  emit('clickHash', props.channel.id)
}

const { openLink } = useOpenLink()
const { channelIdToLink } = useChannelPath()
const openChannel = (event: MouseEvent) => {
  openLink(event, channelIdToLink(props.channel.id) as string)
}

const { pathToShow, pathTooltip } = usePath(props as TypedProps)

const notificationState = useNotificationState(toRef(props, 'channel'))

const { isHovered, onMouseEnter, onMouseLeave } = useHover()
const { isFocused, onFocus, onBlur } = useFocus()
const {
  isHovered: isIconHovered,
  onMouseEnter: onIconMouseEnter,
  onMouseLeave: onIconMouseLeave
} = useHover()
const onIconHovered = () => {
  onIconMouseEnter()
  onMouseEnter()
}
const onIconHoveredLeave = () => {
  onIconMouseLeave()
  onMouseLeave()
}
const isChannelBgHovered = computed(
  () => isHovered.value && !(hasChildren.value && isIconHovered.value)
)

const iconName = computed(() => {
  if (
    props.showNotified &&
    notificationState.subscriptionLevel === ChannelSubscribeLevel.notified
  ) {
    return 'notified'
  }
  if (props.showStar && notificationState.isStarred) {
    return 'star-outline'
  }
  if (props.channel.archived) {
    return 'archive'
  }
  return 'hash'
})
const isIconMdi = computed(() => props.channel.archived)
const iconSize = computed(() => (props.channel.archived ? 17 : undefined))
</script>

<style lang="scss" module>
$elementHeight: 26px;
$bgHeight: 28px;
$bgLeftShift: 4px;

.container {
  @include color-ui-primary;
  display: block;
  user-select: none;
  position: relative;
  contain: layout;
  line-height: 1.2;
  &[data-is-inactive] {
    @include color-ui-secondary;
  }
  &[data-is-selected] {
    @include color-accent-primary;
  }
}
.channelContainer {
  position: relative;
  display: flex;
  height: $elementHeight;
  padding-left: 20px;
  padding-right: 6px;
  margin-left: $bgLeftShift;
  z-index: 1;
  &[data-is-inactive] {
    @include color-ui-secondary;
  }
  &[aria-current='page'] {
    @include color-accent-primary;
  }
}
.channel {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  margin-left: 2px;
  width: calc(100% - 2px);
  text-decoration: none;
}
.channelIcon {
  flex-shrink: 0;
  cursor: pointer;
  position: absolute;
  left: 0;
}

.selectedBg {
  position: absolute;
  height: $bgHeight;
  top: -1 * math.div($bgHeight - $elementHeight, 2);
  left: 2px;
  right: 2px;
  z-index: 0;
  border-radius: 7px;
  opacity: 1;
  pointer-events: none;
  display: none;
  box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.04);

  .container[data-is-selected] > & {
    @include background-accent-primary;
    display: block;
    opacity: 0.1;
  }
  &[data-is-hovered],
  &[data-is-focused] {
    display: block;
    background: $theme-ui-primary-background;
    opacity: 0.2;
  }
  &[data-is-focused] {
    box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.1);
  }
  .container[data-is-selected] > &[data-is-hovered],
  .container[data-is-selected] > &[data-is-focused] {
    @include background-accent-primary;
    opacity: 0.16;
  }
}
.slot {
  position: relative;
  z-index: 1;
  padding-left: $bgLeftShift;
}
</style>
