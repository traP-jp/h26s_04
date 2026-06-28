<template>
  <span :class="$style.container">
    <template v-for="(char, index) in numberChars" :key="index">
      <span v-if="char === ','" :class="$style.separator">
        {{ char }}
      </span>
      <span v-else :class="$style.digitSlot">
        <transition :name="transitionName">
          <span :key="`${index}-${char}`" :class="$style.digit">
            {{ char }}
          </span>
        </transition>
      </span>
    </template>
  </span>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  value: number
}>()

const direction = ref<'up' | 'down'>('up')
const isTransitionEnabled = ref(false)

const transitionName = computed(() =>
  isTransitionEnabled.value ? `count-digit-${direction.value}` : undefined
)
const numberChars = computed(() => props.value.toLocaleString().split(''))

watch(
  () => props.value,
  (newValue, oldValue) => {
    isTransitionEnabled.value = false

    if (newValue === oldValue) return

    direction.value = newValue > oldValue ? 'up' : 'down'
    isTransitionEnabled.value = true
  }
)
</script>

<style lang="scss" module>
.container {
  display: inline-flex;
  align-items: baseline;
  font-variant-numeric: tabular-nums;
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
