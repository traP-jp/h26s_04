<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import RotatingCube from '/@/components/3d/RotatingCube.vue'
import { Vector3 } from 'three'
const cameraPos = new Vector3(3, 3, 3)
const lightPos = new Vector3(5, 5, 5)
</script>

<template>
  <div style="width: 100vw; height: 100vh;">
    <TresCanvas>
      <TresPerspectiveCamera :position="cameraPos" :look-at="[0, 0, 0]" />
      <TresAmbientLight :intensity="1" />
      <TresDirectionalLight :position="lightPos" :intensity="1" />
      <RotatingCube />
    </TresCanvas>
  </div>
</template>
