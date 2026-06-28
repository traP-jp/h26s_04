<template>
  <Transition
    :enter-from-class="$style.collapsed"
    :enter-active-class="$style.expanding"
    :leave-to-class="$style.collapsed"
    :leave-active-class="$style.expanding"
  >
    <div v-if="stamps.length > 0" :class="$style.expandWrapper">
      <div :class="$style.stampWrapper">
        <AIcon
          v-if="showDetailButton"
          name="rounded-triangle"
          :size="20"
          :class="$style.toggleButton"
          :data-is-open="$boolAttr(isDetailShown)"
          @click="toggleDetail"
        />
        <div
          ref="listEle"
          :class="$style.stampList"
          :data-show-details="$boolAttr(isDetailShown)"
          :data-is-overflowing="$boolAttr(isStampListOverflowing)"
        >
          <transition-group name="stamp">
            <div v-for="stamp in stampList" :key="stamp.id" :class="$style.stamp">
              <StampElement
                :stamp="stamp"
                :is-detail-shown="isDetailShown"
                :is-archived="isArchived"
                @add-stamp="addStamp"
                @remove-stamp="removeStamp"
              />
              <StampDetailElement
                v-if="isDetailShown"
                :class="$style.detail"
                :stamp="stamp"
              />
            </div>
          </transition-group>
          <div
            v-if="!isDetailShown && !isArchived"
            :class="$style.stampPickerOpener"
            @click="toggleStampPicker"
          >
            <AIcon mdi name="plus" :size="20" />
          </div>
        </div>
        <span
          v-if="isStampListOverflowing"
          :class="$style.ellipsis"
          aria-hidden="true"
        >
          …
        </span>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import type { MessageStamp } from '@traptitech/traq'

import { computed, nextTick, ref, watch } from 'vue'

import AIcon from '/@/components/UI/AIcon.vue'
import useBoxSize from '/@/composables/dom/useBoxSize'
import useToggle from '/@/composables/utils/useToggle'
import { createStampList } from '/@/lib/messageStampList'
import { useStampUpdater } from '/@/lib/updater/stamp'
import { useMeStore } from '/@/store/domain/me'
import { useStampPickerInvoker } from '/@/store/ui/stampPicker'
import type { StampId } from '/@/types/entity-ids'

import StampDetailElement from './StampDetailElement.vue'
import StampElement from './StampElement.vue'

const props = withDefaults(
  defineProps<{
    stamps: MessageStamp[]
    messageId: string
    showDetailButton?: boolean
    isArchived?: boolean
  }>(),
  {
    showDetailButton: false,
    isArchived: false
  }
)

const { myId } = useMeStore()
const { addStampOptimistically, removeStampOptimistically } = useStampUpdater()
const stampList = computed(() => createStampList(props.stamps, myId.value))

const { value: isDetailShown, toggle: toggleDetail } = useToggle(false)

const addStamp = (stampId: StampId) =>
  addStampOptimistically(props.messageId, stampId)
const removeStamp = (stampId: StampId) =>
  removeStampOptimistically(props.messageId, stampId)

const listEle = ref<HTMLDivElement | null>(null)
const isStampListOverflowing = ref(false)
const { width: stampListWidth } = useBoxSize(listEle)
const updateStampListOverflowing = async () => {
  await nextTick()
  const element = listEle.value
  isStampListOverflowing.value =
    !isDetailShown.value &&
    element !== null &&
    element.scrollHeight > element.clientHeight + 1
}
watch(
  [stampList, isDetailShown, stampListWidth, () => props.isArchived],
  updateStampListOverflowing,
  { immediate: true, flush: 'post' }
)

watch(isDetailShown, async () => {
  const el = listEle.value
  if (!el) return

  // capture start height before DOM update
  const startHeight = el.getBoundingClientRect().height

  await nextTick()

  // temporarily unlock height/overflow to measure true content height,
  // bypassing max-height and contain:paint that can skew scrollHeight
  el.style.maxHeight = 'none'
  el.style.height = 'auto'
  el.style.overflow = 'hidden'
  const endHeight = el.scrollHeight

  if (Math.abs(endHeight - startHeight) < 1) {
    el.style.maxHeight = ''
    el.style.height = ''
    el.style.overflow = ''
    return
  }

  // snap to start height (no transition)
  el.style.height = `${startHeight}px`

  // double rAF: first frame paints startHeight, second frame starts transition
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      el.style.height = `${endHeight}px`
      setTimeout(() => {
        el.style.maxHeight = ''
        el.style.height = ''
        el.style.overflow = ''
        el.style.transition = ''
      }, 320)
    })
  })
})

const { toggleStampPicker } = useStampPickerInvoker(
  async stampData => addStampOptimistically(props.messageId, stampData.id),
  listEle,
  false,
  'top-left'
)
</script>

<style lang="scss" module>
$stamp-height: 1.5rem;
$stamp-row-gap: 0.25rem;

.expandWrapper {
  display: grid;
  grid-template-rows: 1fr;
  overflow: hidden;
}

.collapsed {
  grid-template-rows: 0fr;
}

.expanding {
  transition: grid-template-rows 1s ease;
}

.stampWrapper {
  position: relative;
  padding-top: 8px;
  margin-left: 42px;
  min-height: 0;
}

.toggleButton {
  @include color-ui-secondary;
  position: absolute;
  left: -26px;
  top: 2px;
  cursor: pointer;

  transform: rotate(0turn);
  &[data-is-open] {
    transform: rotate(-0.5turn);
  }
  transition: transform 0.5s;
}

.stampList {
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
  max-height: calc($stamp-height + $stamp-row-gap);
  overflow: hidden;
  overflow: clip;
  &[data-is-overflowing]:not([data-show-details]) {
    padding-right: 1.25rem;
  }
  &[data-show-details] {
    flex-direction: column;
    max-height: unset;
    overflow: visible;
  }
  contain: content;
}
.stamp {
  margin: {
    right: 0.25rem;
    bottom: 0.25rem;
  }

  display: flex;
}
.detail {
  margin-left: 4px;
}

.stampPickerOpener {
  display: flex;
  height: 100%;
  align-items: center;
  border: 2px solid var(--specific-stamp-picker-opener-border);
  border-radius: 4px;
  color: var(--specific-stamp-picker-opener-border);
  cursor: pointer;
}

.ellipsis {
  @include color-ui-secondary;
  @include size-body2;
  position: absolute;
  top: 0;
  right: 0;
  height: $stamp-height;
  width: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-weight: bold;
  pointer-events: none;
  text-shadow:
    0 0 2px $theme-background-primary-default,
    0 0 4px $theme-background-primary-default;
}
</style>
