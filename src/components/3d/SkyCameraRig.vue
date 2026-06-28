<script lang="ts" setup>
import { shallowRef } from 'vue'

import { useLoop } from '@tresjs/core'
import type { PerspectiveCamera } from 'three'

import { useSkyCamera } from '/@/composables/useSkyCamera'

const props = withDefaults(defineProps<{ radius?: number }>(), {
  radius: 15
})

const { camPositionAt, targetFov } = useSkyCamera()

const camRef = shallowRef<PerspectiveCamera>()

const { onBeforeRender } = useLoop()
// カメラ状態の前進（tick）は useSkyCamera 内の単一ループが担当。
// ここではその共有状態を読み取って各キャンバスのカメラへ反映するだけ（複数リグ可）。
onBeforeRender(() => {
  const cam = camRef.value
  if (!cam) return

  cam.position.copy(camPositionAt(props.radius))
  cam.lookAt(0, 0, 0)

  if (Math.abs(cam.fov - targetFov.value) > 0.01) {
    cam.fov += (targetFov.value - cam.fov) * 0.12
    cam.updateProjectionMatrix()
  }
})
</script>

<template>
  <TresPerspectiveCamera ref="camRef" :fov="70" />
</template>
