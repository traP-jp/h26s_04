<script lang="ts" setup>
import { shallowRef } from 'vue'

import { useLoop } from '@tresjs/core'
import type { PerspectiveCamera } from 'three'

import { useSkyCamera } from '/@/composables/useSkyCamera'

const props = withDefaults(defineProps<{ radius?: number }>(), {
  radius: 15
})

const { camPositionAt, focusTarget, targetFov } = useSkyCamera()

const camRef = shallowRef<PerspectiveCamera>()
let renderedRadius = props.radius

const { onBeforeRender } = useLoop()
// カメラ状態の前進（tick）は useSkyCamera 内の単一ループが担当。
// ここではその共有状態を読み取って各キャンバスのカメラへ反映するだけ（複数リグ可）。
onBeforeRender(() => {
  const cam = camRef.value
  if (!cam) return

  if (Math.abs(renderedRadius - props.radius) > 0.01) {
    renderedRadius += (props.radius - renderedRadius) * 0.12
  } else {
    renderedRadius = props.radius
  }

  cam.position.copy(camPositionAt(renderedRadius))
  cam.lookAt(focusTarget.value)

  if (Math.abs(cam.fov - targetFov.value) > 0.01) {
    cam.fov += (targetFov.value - cam.fov) * 0.12
    cam.updateProjectionMatrix()
  }
})
</script>

<template>
  <TresPerspectiveCamera ref="camRef" :fov="70" />
</template>
