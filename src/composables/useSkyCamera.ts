import { ref } from 'vue'

import { createSharedComposable } from '@vueuse/core'

const DRAG_SPEED = 0.0042
const DAMP = 0.94
const PHI_MIN = 0.18
const PHI_MAX = Math.PI - 0.18
const FOV_MIN = 18
const FOV_MAX = 100
const ZOOM_SPEED = 0.05

const clampPhi = (v: number) => Math.max(PHI_MIN, Math.min(PHI_MAX, v))

const _useSkyCamera = () => {
  const prefersReduced = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches
  const AUTO = prefersReduced ? 0 : 0.00025

  const camTheta = ref(0)
  const camPhi = ref(Math.PI / 2)
  const velTheta = ref(0)
  const velPhi = ref(0)
  const dragging = ref(false)
  const targetFov = ref(70)

  let lastX = 0
  let lastY = 0

  const onPointerDown = (e: PointerEvent) => {
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    dragging.value = true
    lastX = e.clientX
    lastY = e.clientY
    velTheta.value = 0
    velPhi.value = 0
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging.value) return
    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY
    camTheta.value -= dx * DRAG_SPEED
    camPhi.value = clampPhi(camPhi.value + dy * DRAG_SPEED)
    velTheta.value = -dx * DRAG_SPEED
    velPhi.value = dy * DRAG_SPEED
  }

  const onPointerUp = () => {
    dragging.value = false
  }

  const onWheel = (e: WheelEvent) => {
    targetFov.value = Math.max(
      FOV_MIN,
      Math.min(FOV_MAX, targetFov.value + e.deltaY * ZOOM_SPEED)
    )
  }

  const tick = () => {
    if (dragging.value) return
    camTheta.value += velTheta.value + AUTO
    camPhi.value = clampPhi(camPhi.value + velPhi.value)
    velTheta.value *= DAMP
    velPhi.value *= DAMP
  }

  return {
    camTheta,
    camPhi,
    targetFov,
    dragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    tick,
  }
}

export const useSkyCamera = createSharedComposable(_useSkyCamera)
