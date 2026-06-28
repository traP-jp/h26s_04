<template>
  <div :class="$style.container">
    <div
      :class="$style.layoutContainer"
      :data-layout="layout"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel.prevent="onWheel"
    >
      <TresCanvas :class="$style.starfield" clear-color="#000004" window-size>
        <SkyCameraRig :radius="15" />
        <StarfieldScene />
      </TresCanvas>
      <QallAudio />

      <PrimaryViewSelector :is-ready="isMounted" />
      <div id="sidebar-opener" :class="$style.hidden" />
      <SecondaryViewSelector v-if="layout !== 'single'" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { TresCanvas } from '@tresjs/core'

import SkyCameraRig from '/@/components/3d/SkyCameraRig.vue'
import StarfieldScene from '/@/components/3d/StarfieldScene.vue'
import { useSkyCamera } from '/@/composables/useSkyCamera'
import { useMainViewStore } from '/@/store/ui/mainView'

import PrimaryViewSelector from './PrimaryViewSelector.vue'
import QallAudio from './QallView/QallAudio.vue'
import SecondaryViewSelector from './SecondaryViewSelector.vue'

const { layout } = useMainViewStore()
const { onPointerDown, onPointerMove, onPointerUp, onWheel } = useSkyCamera()

const isMounted = ref(false)
onMounted(() => {
  isMounted.value = true
})
onBeforeUnmount(() => {
  isMounted.value = false
})
</script>

<style lang="scss" module>
.container {
  display: flex;
  flex-direction: column;
}

.iosPwaInfoLink {
  text-decoration: underline;
}

.layoutContainer {
  position: relative;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;

  &[data-layout|='split'] {
    display: flex;
  }
  &[data-layout='split'] {
    flex-direction: column;
  }
  &[data-layout='split-reverse'] {
    flex-direction: column-reverse;
  }
}

.hidden {
  position: absolute;
  right: 0;
  top: 0;
  pointer-events: none;
}

.starfield {
  // ビューポート全体を覆う最背面レイヤー。ドラッグは下の layoutContainer に通す
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
</style>
