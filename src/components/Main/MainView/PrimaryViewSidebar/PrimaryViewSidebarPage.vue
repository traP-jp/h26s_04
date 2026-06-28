<template>
  <div :class="$style.container" @wheel.stop>
    <div :class="$style.header">
      <AIcon
        v-if="showBackButton"
        :size="28"
        mdi
        name="chevron-left"
        :class="$style.backButton"
        @click="emit('back')"
      />
      <slot name="header" />
    </div>
    <div :class="$style.content">
      <slot name="content" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import AIcon from '/@/components/UI/AIcon.vue'

withDefaults(
  defineProps<{
    showBackButton?: boolean
  }>(),
  {
    showBackButton: false
  }
)

const emit = defineEmits<{
  (e: 'back'): void
}>()
</script>

<style lang="scss" module>
.container {
  @include color-ui-secondary;
  display: flex;
  flex-direction: column;
  width: 320px;
  height: 100%;
  overflow: auto;
  overscroll-behavior: contain;
  background: linear-gradient(
    to right,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 1) 100%
  );
  font-family:
    'Monaspace Neon', 'Monaspace Argon', 'Monaspace Xenon', 'Monaspace Krypton',
    'Monaspace Radon', 'Monaspace', 'JetBrains Mono', 'Cascadia Code',
    'Fira Code', 'SFMono-Regular', 'Menlo', 'Consolas', monospace;
  font-feature-settings: 'calt' 1;
  font-size: 0.92rem;
  line-height: 1.2;
  letter-spacing: 0;
}

.header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
  align-items: center;
  flex-shrink: 0;
  height: 44px;
  padding: 0 16px;
}

.backButton {
  flex-shrink: 0;
  margin-right: 6px;
  cursor: pointer;
}

.content {
  height: 100%;
  padding: 16px;
  padding-top: 0;
  overflow: {
    x: hidden;
    y: auto;
  }
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}
</style>
