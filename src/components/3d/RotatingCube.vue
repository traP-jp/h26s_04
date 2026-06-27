<script setup lang="ts">
import { ref } from 'vue'

import { useLoop } from '@tresjs/core'

const boxRef = ref()

const { onRender } = useLoop()
onRender(() => {
  if (boxRef.value) {
    boxRef.value.rotation.y += 0.01
    boxRef.value.rotation.x += 0.005
  }
})
</script>

<template>
  <TresMesh ref="boxRef">
    <TresBoxGeometry :args="[1, 1, 1]" />
    <TresMeshStandardMaterial color="#4ecdc4" />
  </TresMesh>
</template>
