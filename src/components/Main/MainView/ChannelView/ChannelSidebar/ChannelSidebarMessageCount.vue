<template>
  <SidebarContentContainer title="総メッセージ数">
    <div :class="$style.content">
      <span
        v-if="!isMessageCountVisible"
        :class="$style.count"
        :data-is-muted="$boolAttr(totalMessageCount === undefined || isFailed)"
      >
        {{ messageCountText }}
      </span>
      <span v-else :class="$style.count">
        <template v-for="(char, index) in messageCountChars" :key="index">
          <span v-if="char === ','" :class="$style.separator">
            {{ char }}
          </span>
          <span v-else :class="$style.digitSlot">
            <transition :name="countTransitionName">
              <span :key="`${index}-${char}`" :class="$style.digit">
                {{ char }}
              </span>
            </transition>
          </span>
        </template>
      </span>
    </div>
  </SidebarContentContainer>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'

import SidebarContentContainer from '/@/components/Main/MainView/PrimaryViewSidebar/SidebarContentContainer.vue'

const props = defineProps<{
  totalMessageCount?: number
  isLoading: boolean
  isFailed: boolean
}>()

const countDirection = ref<'up' | 'down'>('up')
const isDigitTransitionEnabled = ref(false)

const isMessageCountVisible = computed(
  () => !props.isFailed && props.totalMessageCount !== undefined
)

const countTransitionName = computed(() =>
  isDigitTransitionEnabled.value
    ? `count-digit-${countDirection.value}`
    : undefined
)

const messageCountText = computed(() => {
  if (props.isFailed) return 'error'
  if (props.totalMessageCount === undefined) {
    return props.isLoading ? 'loading' : '-'
  }

  return props.totalMessageCount.toLocaleString()
})

const messageCountChars = computed(() =>
  isMessageCountVisible.value && props.totalMessageCount !== undefined
    ? props.totalMessageCount.toLocaleString().split('')
    : []
)

watch(
  () => props.totalMessageCount,
  (newValue, oldValue) => {
    isDigitTransitionEnabled.value = false

    if (oldValue === undefined) return
    if (newValue === undefined) return
    if (newValue === oldValue) return

    countDirection.value = newValue > oldValue ? 'up' : 'down'
    isDigitTransitionEnabled.value = true
  }
)
</script>

<style lang="scss" module>
.content {
  display: flex;
  align-items: baseline;
}

.count {
  @include color-ui-primary;
  display: inline-flex;
  align-items: baseline;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;

  &[data-is-muted] {
    @include color-ui-tertiary;
    font-weight: normal;
  }
}

.digitSlot {
  display: inline-grid;
  grid-template: 'digit' 1.2em / 0.6em;
  place-items: center;
  height: 1.2em;
  overflow: hidden;
}

.digit,
.separator {
  display: inline-block;
}

.digit {
  grid-area: digit;
}

.separator {
  min-width: 0.3em;
}

:global(.count-digit-up-enter-active),
:global(.count-digit-up-leave-active),
:global(.count-digit-down-enter-active),
:global(.count-digit-down-leave-active) {
  transition: transform 90ms ease-out;
}

:global(.count-digit-up-enter-from),
:global(.count-digit-down-leave-to) {
  transform: translateY(85%);
}

:global(.count-digit-up-leave-to),
:global(.count-digit-down-enter-from) {
  transform: translateY(-85%);
}

@media (prefers-reduced-motion: reduce) {
  :global(.count-digit-up-enter-active),
  :global(.count-digit-up-leave-active),
  :global(.count-digit-down-enter-active),
  :global(.count-digit-down-leave-active) {
    transition: none;
  }
}
</style>
