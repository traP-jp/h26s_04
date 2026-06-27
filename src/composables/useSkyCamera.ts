import { computed, onScopeDispose, ref } from 'vue'

import * as THREE from 'three'
import { createSharedComposable } from '@vueuse/core'

// 天球の中心からカメラまでの距離（MainView 背景など半径を問わない場面の既定値）
// 球面ページでは SkyCameraRig が camPositionAt(radius) で別半径を指定する
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
// StarfieldScene と複数の MessageSphere が同じドラッグ回転に追従できるのはこの仕組みによる
// （状態の前進 tick は下記の単一 rAF ループが担当。各 SkyCameraRig は読み取って反映するだけ）
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

  // 球座標 (camTheta, camPhi) から、指定半径での Three.js 空間上のカメラ位置を計算する
  // 角度は共有しつつ半径だけ消費側ごとに変えられるようにする（星空は遠距離・球面ページは球の外側など）
  const camPositionAt = (radius: number) => {
    const sp = Math.sin(camPhi.value)
    return new THREE.Vector3(
      radius * sp * Math.cos(camTheta.value),
      radius * Math.cos(camPhi.value),
      radius * sp * Math.sin(camTheta.value)
    )
  }

  // ここで一元管理することで各 3D コンポーネントが同じ位置を参照できる
  const camPosition = computed(() => camPositionAt(CAM_RADIUS))

  let lastX = 0
  let lastY = 0

  const onPointerDown = (e: PointerEvent) => {
    // setPointerCapture によりポインターが要素外に出ても pointermove/pointerup を受け取り続ける
    // window へのリスナー登録が不要になる
    ; (e.currentTarget as Element).setPointerCapture(e.pointerId)
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
  const tick = () => {
    if (dragging.value) return
    camTheta.value += velTheta.value + AUTO
    camPhi.value = clampPhi(camPhi.value + velPhi.value)
    velTheta.value *= DAMP
    velPhi.value *= DAMP
  }

  // tick はカメラ状態を進める唯一の場所。複数の SkyCameraRig が同時に存在しても
  // 二重に進めないよう、共有 composable 内の単一 requestAnimationFrame ループで回す。
  // createSharedComposable のスコープが破棄されるとき（全消費者がアンマウント）に停止する。
  let rafId = 0
  const loop = () => {
    tick()
    rafId = requestAnimationFrame(loop)
  }
  rafId = requestAnimationFrame(loop)
  onScopeDispose(() => cancelAnimationFrame(rafId))

  return {
    camTheta,
    camPhi,
    camPosition,
    camPositionAt,
    targetFov,
    dragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel
  }
}

export const useSkyCamera = createSharedComposable(_useSkyCamera)
