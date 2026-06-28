<script setup lang="ts">
import type { Channel } from '@traptitech/traq'

import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'

import { Html } from '@tresjs/cientos'
import { useLoop } from '@tresjs/core'
import { Color, Vector3 } from 'three'
import type { Group } from 'three'

import { useSkyCamera } from '/@/composables/useSkyCamera'
import { useChannelsStore } from '/@/store/entities/channels'
import type { ChannelId } from '/@/types/entity-ids'

// 親メッセージ球（半径40の不可視シェル）の外側、共有カメラ半径90の内側に衛星を周回させる
// カメラ半径（90）より大きくすることで、手前側に来た衛星は「カメラの裏（画面外）」を通る。
// 表示される衛星は常にメッセージカード（半径40の球）より遠く=奥になるため、
// カードの occlude（手前のメッシュでカードが消える）やラベルの被りが起きない。
const ORBIT_RADIUS = 100
const SATELLITE_RADIUS = 4
// 公転角速度（rad/s）
const ORBIT_SPEED = 0.08
// この距離（px）以上ポインタが動いたらドラッグ（カメラ回転）とみなし、遷移しない
const CLICK_MOVE_THRESHOLD = 6
// カメラ半径（ChannelViewContentMain の SkyCameraRig と一致させる）
const CAMERA_RADIUS = 90
// 裏側（視線方向に最も奥）の衛星の不透明度。手前ほど 1 に近づく（裏側フェード）
const MIN_OPACITY = 0.45

// TresJS（@pmndrs/pointer-events）のクリックイベントから必要な部分のみを構造的に受け取る
type SatellitePointerEvent = {
  nativeEvent: MouseEvent
  stopPropagation: () => void
}

const props = withDefaults(
  defineProps<{
    channelId: ChannelId
    interactive?: boolean
    paused?: boolean
    showLabels?: boolean
    highlightedChannelId?: ChannelId
    highlightedAngle?: number
    // <TresCanvas> は別の Vue アプリを生成し vue-router が注入されないため、
    // 遷移処理は通常コンテキストにある親（ChannelViewContentMain）に委譲する。
    // focusAngle はクリックした衛星の赤道面上のワールド角（遷移演出のフォーカス用）。
    selectChannel: (
      channelId: ChannelId,
      event: PointerEvent,
      focusAngle: number
    ) => void
  }>(),
  {
    interactive: true,
    paused: false,
    showLabels: true
  }
)

// ルート要素が <TresGroup> 1個だと vueCompilerOptions.fallthroughAttributes により
// Volar が props 型を {} に誤推論してしまう。3D シーンノードに属性継承は不要なので無効化する。
defineOptions({ inheritAttrs: false })

const prefersReduced = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches
const orbitSpeed = prefersReduced ? 0 : ORBIT_SPEED

const { channelsMap } = useChannelsStore()
const { camPositionAt } = useSkyCamera()

// 現在のチャンネルの子チャンネルを赤道リング上の衛星として並べる
const satellites = computed(() => {
  const parent = channelsMap.value.get(props.channelId)
  if (!parent) return []

  const children = parent.children
    .map(id => channelsMap.value.get(id))
    .filter((c): c is Channel => c !== undefined && !c.archived)

  const n = children.length
  return children.map((ch, i) => {
    const defaultAngle = (i / n) * Math.PI * 2
    const isHighlighted = ch.id === props.highlightedChannelId
    const angle =
      isHighlighted && props.highlightedAngle !== undefined
        ? props.highlightedAngle
        : defaultAngle
    return {
      id: ch.id,
      name: ch.name,
      isHighlighted,
      radius: isHighlighted ? SATELLITE_RADIUS * 1.35 : SATELLITE_RADIUS,
      angle,
      position: new Vector3(
        Math.cos(angle) * ORBIT_RADIUS,
        0,
        Math.sin(angle) * ORBIT_RADIUS
      ),
      color: new Color().setHSL(i / n, 0.6, 0.6)
    }
  })
})

// 各衛星の不透明度。onBeforeRender で毎フレーム更新する。
// カメラの裏（視界の後方）に回った衛星は cientos <Html> がラベルを画面端へ誤投影するため、
// 不透明度を 0 にして隠す。
const opacities = ref<number[]>([])

const groupRef = shallowRef<Group>()
// 最新の公転回転量。クリック時に衛星のワールド角を求めるために保持する
let latestGroupRot = 0
const groupWorldPosition = new Vector3()

const { onBeforeRender } = useLoop()
onBeforeRender(({ elapsed }) => {
  const sats = satellites.value
  const groupRot = props.paused ? 0 : elapsed * orbitSpeed
  latestGroupRot = groupRot

  const group = groupRef.value
  if (group) group.rotation.y = groupRot

  const camPos = camPositionAt(CAMERA_RADIUS)
  if (group) {
    group.getWorldPosition(groupWorldPosition)
    camPos.sub(groupWorldPosition)
  }
  const camLen2 = camPos.lengthSq()
  const camLen = Math.sqrt(camLen2) || 1
  // 視線方向の最大奥行き（最も裏側の衛星）。これで深さを正規化する。
  const depthSpan = CAMERA_RADIUS + ORBIT_RADIUS
  sats.forEach((sat, i) => {
    // rotation.y 適用後のワールド角（y=0 平面なので位置は角度のみで決まる）
    const worldAngle = sat.angle - groupRot
    const sx = Math.cos(worldAngle) * ORBIT_RADIUS
    const sz = Math.sin(worldAngle) * ORBIT_RADIUS
    // カメラから視線方向（カメラ→原点）に沿った符号付き距離。負ならカメラの裏。
    const forwardDist = (camLen2 - (sx * camPos.x + sz * camPos.z)) / camLen
    // カメラの裏（forwardDist<0）に回った衛星は隠す。境界付近を滑らかに。
    const cull = Math.max(0, Math.min(1, forwardDist / 8))
    // 視線方向に深い（=裏側）ほど暗く。手前は 1、最奥は MIN_OPACITY。
    const depth = Math.min(1, Math.max(0, forwardDist / depthSpan))
    const brightness = 1 - depth * (1 - MIN_OPACITY)
    opacities.value[i] = cull * brightness
  })
  if (opacities.value.length > sats.length) {
    opacities.value.length = sats.length
  }
})

// 親 layoutContainer が pointerdown で setPointerCapture するため、canvas には pointerup が
// 届かず TresJS の合成 click が発火しない。そこで「canvas に必ず届く pointerdown」で押下を記録し、
// window 側の pointerup（キャプチャ対象から window へバブルする）でタップ/ドラッグを判定する。
let press: {
  channelId: ChannelId
  baseAngle: number
  x: number
  y: number
} | null = null

const onWindowPointerUp = (event: PointerEvent) => {
  const p = press
  press = null
  if (!p) return
  const moved = Math.hypot(event.clientX - p.x, event.clientY - p.y)
  if (moved > CLICK_MOVE_THRESHOLD) return // ドラッグだったので遷移しない
  // rotation.y 適用後のワールド角（onBeforeRender と同じ式）を遷移演出のフォーカスに渡す
  const focusAngle = p.baseAngle - latestGroupRot
  // 実際の遷移（router 依存）は親に委譲する
  props.selectChannel(p.channelId, event, focusAngle)
}

const onPointerDown = (
  channelId: ChannelId,
  baseAngle: number,
  event: SatellitePointerEvent
) => {
  if (props.interactive === false) return
  const ne = event.nativeEvent
  press = { channelId, baseAngle, x: ne.clientX, y: ne.clientY }
  window.addEventListener('pointerup', onWindowPointerUp, { once: true })
}

onBeforeUnmount(() => {
  window.removeEventListener('pointerup', onWindowPointerUp)
})
</script>

<template>
  <TresGroup ref="groupRef">
    <TresGroup
      v-for="(sat, i) in satellites"
      :key="sat.id"
      :position="sat.position"
    >
      <TresMesh @pointerdown="onPointerDown(sat.id, sat.angle, $event)">
        <TresSphereGeometry :args="[sat.radius, 16, 16]" />
        <TresMeshStandardMaterial
          :color="sat.color"
          transparent
          :opacity="opacities[i] ?? 1"
        />
      </TresMesh>
      <Html v-if="props.showLabels" center pointer-events="none">
        <div
          :class="[
            $style.label,
            sat.isHighlighted ? $style.highlightedLabel : undefined
          ]"
          :style="{ opacity: opacities[i] ?? 1 }"
        >
          {{ sat.name }}
        </div>
      </Html>
    </TresGroup>
  </TresGroup>
</template>

<style lang="scss" module>
.label {
  // 常にカメラを向くビルボードラベル。クリックは小球メッシュに任せるため透過させる
  pointer-events: none;
  white-space: nowrap;
  transform: translateY(-24px);
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  user-select: none;
}

.highlightedLabel {
  background: rgba(255, 255, 255, 0.86);
  color: #111;
}
</style>
