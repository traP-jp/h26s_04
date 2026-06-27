<template>
  <ClickOutside :enabled="showMessageTools" @click-outside="onClickOutside">
    <div
      v-if="message"
      ref="bodyRef"
      :class="$style.body"
      :data-is-mobile="$boolAttr(isMobile)"
      :data-is-pinned="$boolAttr(message.pinned)"
      :data-is-entry="$boolAttr(isEntryMessage)"
      :data-is-editing="$boolAttr(isEditing)"
      :data-is-active="$boolAttr(isActive)"
      @pointerenter="onPointerEnter"
      @click="onClick"
      @mouseleave="onMouseLeave"
    >
      <MessageTools
        v-model:is-active="isActive"
        :show="showMessageTools"
        :class="$style.tools"
        :message-id="messageId"
        :is-minimum="isArchived"
      />
      <MessagePinned
        v-if="pinnedUserId"
        :pinned-user-id="pinnedUserId"
        :class="$style.pinned"
      />
      <div
        :class="$style.foldWrapper"
        :data-is-message-oversized="$boolAttr(isMessageOversized)"
        :data-is-message-folded="$boolAttr(isMessageActuallyFolded)"
      >
        <div
          :class="$style.foldContent"
          :data-is-message-folded="$boolAttr(isMessageActuallyFolded)"
        >
          <div ref="foldContentInnerRef">
            <MessageContents
              :class="$style.messageContents"
              :message-id="messageId"
            />
          </div>
        </div>
        <FoldButton
          v-if="isMessageOversized"
          :is-fold="isMessageActuallyFolded"
          :class="$style.foldButton"
          :aria-expanded="!isMessageActuallyFolded"
          background="none"
          show-icon
          small
          @click="toggleMessageFold"
        />
      </div>
      <MessageStampList
        :show-detail-button="isHovered || isMobile"
        :message-id="messageId"
        :stamps="message.stamps"
        :is-archived="isArchived"
      />
    </div>
  </ClickOutside>
</template>

<script lang="ts" setup>
import { computed, ref, shallowRef, toRef } from 'vue'

import MessageTools, {
  useMessageToolsHover
} from '/@/components/Main/MainView/MessageElement/MessageTools.vue'
import ClickOutside from '/@/components/UI/ClickOutside'
import FoldButton from '/@/components/UI/FoldButton.vue'
import useBoxSize from '/@/composables/dom/useBoxSize'
import useEmbeddings from '/@/composables/message/useEmbeddings'
import useResponsive from '/@/composables/useResponsive'
import useToggle from '/@/composables/utils/useToggle'
import { useMessagesStore } from '/@/store/entities/messages'
import { useMessageEditingStateStore } from '/@/store/ui/messageEditingStateStore'
import type { MessageId, UserId } from '/@/types/entity-ids'

import MessageContents from './MessageContents.vue'
import MessagePinned from './MessagePinned.vue'
import MessageStampList from './MessageStampList.vue'
import type { ChangeHeightData } from './composables/useElementRenderObserver'
import useElementRenderObserver from './composables/useElementRenderObserver'

const props = withDefaults(
  defineProps<{
    messageId: MessageId
    pinnedUserId?: UserId
    isEntryMessage?: boolean
    isArchived?: boolean
  }>(),
  {
    isEntryMessage: false,
    isArchived: false
  }
)

const emit = defineEmits<{
  (e: 'entryMessageLoaded', _relativePos: number): void
  (e: 'changeHeight', _data: ChangeHeightData): void
}>()

const isActive = ref(false)

const bodyRef = shallowRef<HTMLDivElement | null>(null)
const foldContentInnerRef = shallowRef<HTMLDivElement | null>(null)
const MESSAGE_MAX_HEIGHT = 300
const { isMobile } = useResponsive()
const { getMessageRef } = useMessagesStore()
const message = computed(() => getMessageRef(props.messageId).value)

const { editingMessageId } = useMessageEditingStateStore()
const isEditing = computed(() => props.messageId === editingMessageId.value)

const { embeddingsState } = useEmbeddings(props)

const { height: foldContentHeight } = useBoxSize(foldContentInnerRef)
const isMessageOversized = computed(
  () =>
    !isEditing.value &&
    foldContentHeight.value !== undefined &&
    foldContentHeight.value > MESSAGE_MAX_HEIGHT
)
const { value: isMessageFolded, toggle: toggleMessageFoldImpl } =
  useToggle(true)
const isMessageActuallyFolded = computed(
  () => isMessageOversized.value && isMessageFolded.value
)
const toggleMessageFold = (e: MouseEvent) => {
  e.stopPropagation()
  toggleMessageFoldImpl()
}

useElementRenderObserver(
  bodyRef,
  toRef(props, 'isEntryMessage'),
  toRef(props, 'messageId'),
  embeddingsState,
  emit
)

const { isHovered, onPointerEnter, onClick, onMouseLeave, onClickOutside } =
  useMessageToolsHover()
const showMessageTools = computed(
  () => (isHovered.value && !isEditing.value) || isActive.value
)
</script>

<style lang="scss" module>
$messagePadding: 32px;
$messagePaddingMobile: 16px;
$messageDebugWidth: 600px;
$messageMaxHeight: 300px;
$foldButtonHeight: 28px;
$maskImage: linear-gradient(
  black,
  black calc(100% - $foldButtonHeight * 2),
  rgba(0, 0, 0, 0.1) calc(100% - $foldButtonHeight),
  transparent 100%
);

.body {
  position: relative;
  width: $messageDebugWidth;
  max-width: calc(100% - 16px);
  min-width: 0;
  overflow: hidden;
  overflow: clip;
  margin: 6px auto;
  border: 1px dashed rgba(255, 96, 160, 0.72);
  border-radius: 4px;
  padding: 8px $messagePadding;
  &[data-is-mobile] {
    padding: 8px $messagePaddingMobile;
  }
  &[data-is-pinned] {
    background: $common-background-pin;
  }
  &[data-is-entry] {
    // TODO: 色を正しくする
    background: $common-background-pin;
  }
  &:not([data-is-editing]):not([data-is-pinned]):not([data-is-entry]) {
    &[data-is-active],
    &:hover {
      background: var(--specific-message-hover-background);
    }
  }
}

.foldWrapper {
  position: relative;
  min-width: 0;

  &[data-is-message-oversized]:not([data-is-message-folded]) {
    padding-bottom: $foldButtonHeight;
  }
}

.foldContent {
  &[data-is-message-folded] {
    max-height: $messageMaxHeight;
    overflow: hidden;
    overflow: clip;
    -webkit-mask-image: $maskImage;
    mask-image: $maskImage;
  }
}

.pinned {
  padding: {
    top: 4px;
    bottom: 8px;
  }
}

.messageContents {
  min-width: 0;
}

.tools {
  position: absolute;
  top: 4px;
  right: 16px;
  z-index: $z-index-message-element-tools;
}

.foldButton {
  cursor: pointer;
  position: absolute;
  left: 50px;
  bottom: 0;
  z-index: 1;

  @media (any-hover: hover) {
    &:hover {
      @include background-tertiary;
    }
  }
  &:focus-visible {
    @include background-tertiary;
  }
}
</style>
