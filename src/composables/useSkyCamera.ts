import { computed, ref } from 'vue'

import { createSharedComposable } from '@vueuse/core'
import * as THREE from 'three'

// 天球の中心からカメラまでの距離。StarfieldBackground・MessageSphere で共用する
export const CAM_RADIUS = 15

const DRAG_SPEED = 0.0042
// フレームごとに速度へ掛ける減衰係数（1に近いほど慣性が長く続く）
const DAMP = 0.94
// 極付近でカメラが反転しないよう天頂角に下限・上限を設ける
const PHI_MIN = 0.18
const PHI_MAX = Math.PI - 0.18
const FOV_MIN = 18
const FOV_MAX = 100
const ZOOM_SPEED = 0.05

const clampPhi = (v: number) => Math.max(PHI_MIN, Math.min(PHI_MAX, v))

// createSharedComposable により全コンポーネントで同一の状態インスタンスを共有する
// StarfieldBackground と MessageSphere が同じドラッグ回転に追従できるのはこの仕組みによる
const _useSkyCamera = () => {
  const prefersReduced = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches
  // prefers-reduced-motion が有効なときは自動回転を止める
  const AUTO = prefersReduced ? 0 : 0.00025

  const camTheta = ref(0)
  const camPhi = ref(Math.PI / 2)
  const velTheta = ref(0)
  const velPhi = ref(0)
  const dragging = ref(false)
  // ズームの目標 FOV。アニメーションループ内で実際の camera.fov へ滑らかに補間される
  const targetFov = ref(70)

  // 球座標 (camTheta, camPhi) から Three.js 空間上のカメラ位置を計算する
  // ここで一元管理することで各 3D コンポーネントが同じ位置を参照できる
  const camPosition = computed(() => {
    const sp = Math.sin(camPhi.value)
    return new THREE.Vector3(
      CAM_RADIUS * sp * Math.cos(camTheta.value),
      CAM_RADIUS * Math.cos(camPhi.value),
      CAM_RADIUS * sp * Math.sin(camTheta.value)
    )
  })

  let lastX = 0
  let lastY = 0

  const onPointerDown = (e: PointerEvent) => {
    // setPointerCapture によりポインターが要素外に出ても pointermove/pointerup を受け取り続ける
    // window へのリスナー登録が不要になる
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

  // 慣性と自動回転を 1 フレーム分進める
  // Vue のリアクティビティではなく requestAnimationFrame ループから呼び出すこと
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
    camPosition,
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
