<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { ref, shallowRef, watch } from 'vue'

import { useLoop } from '@tresjs/core'
import { Vector3 } from 'three'
import type { Group } from 'three'

import ViewerBillboard from '/@/components/3d/ViewerBillboard.vue'
import type { UserId } from '/@/types/entity-ids'

// 閲覧者を環状（リング）に等間隔で並べる。
// メッセージカード球（半径40）の外側・子チャンネル衛星（半径100）の内側に置く。
const VIEWER_RING_RADIUS = 60
// リングの高さ（y）。0 で環の中心が原点。
const VIEWER_RING_HEIGHT = 0
// 環の面を赤道から傾ける角度（ラジアン）
const VIEWER_TILT = Math.PI / 6
// 環の自動公転の角速度（rad/s）。衛星のようにゆっくり回す。
const VIEWER_ORBIT_SPEED = 0.1
// 位置・不透明度の補間の滑らかさ。t = 1 - exp(-k*dt)。大きいほど速く目標へ寄る。
const SMOOTHING = 6

const props = defineProps<{
  userIds: UserId[]
}>()

// ルートが単一の <TresGroup> のとき vue-tsc が props を {} に誤推論するのを回避
defineOptions({ inheritAttrs: false })

const prefersReduced = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches
// prefers-reduced-motion が有効なときは自動公転を止める
const orbitSpeed = prefersReduced ? 0 : VIEWER_ORBIT_SPEED

type Anim = {
  // リング上の目標位置
  target: Vector3
  // 毎フレーム target へ補間される実位置（親 Group へ反映）
  current: Vector3
  // 現在の不透明度（0=非表示）。入場 0→1、退場 →0。
  opacity: number
  // 目標不透明度（1=表示中, 0=退場中）
  targetOpacity: number
}

// 退場アニメ中も含めた描画順（userId）。template の v-for 対象。
const order = shallowRef<UserId[]>([])
// 各 userId のアニメ状態（非リアクティブ。位置は毎フレーム Group へ直接反映）
const anims = new Map<UserId, Anim>()
// DOM へ渡す不透明度（リアクティブ）
const opacities = ref<Record<UserId, number>>({})
// 各 TresGroup インスタンス
const groups = new Map<UserId, Group>()
// 自動公転する内側グループ（毎フレーム rotation.y を進める）
const spinRef = shallowRef<Group>()

// 人数 n を水平リング上に等間隔で配置した目標位置を返す
const computeTargets = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * Math.PI * 2
    return new Vector3(
      Math.cos(angle) * VIEWER_RING_RADIUS,
      VIEWER_RING_HEIGHT,
      Math.sin(angle) * VIEWER_RING_RADIUS
    )
  })

const setGroupRef =
  (userId: UserId) =>
  (el: Element | ComponentPublicInstance | null) => {
    if (el) {
      const group = el as unknown as Group
      groups.set(userId, group)
      // 初フレームの原点チラつきを防ぐため、登録時点で現在位置を反映
      const a = anims.get(userId)
      if (a) group.position.copy(a.current)
    } else {
      groups.delete(userId)
    }
  }

// userIds の増減に追従して、残留・新規・退場を組み替える
watch(
  () => props.userIds,
  ids => {
    const targets = computeTargets(ids.length)
    // いなくなったユーザーは退場（フェードアウト）させる
    for (const [userId, a] of anims) {
      if (!ids.includes(userId)) a.targetOpacity = 0
    }
    // 残留＋新規を現在の人数でのリング配置へ
    ids.forEach((id, i) => {
      const pos = targets[i] ?? new Vector3()
      const a = anims.get(id)
      if (a) {
        a.target.copy(pos)
        a.targetOpacity = 1
      } else {
        // 新規は目標位置に出現し、不透明度 0→1 でフェードイン
        anims.set(id, {
          target: pos.clone(),
          current: pos.clone(),
          opacity: 0,
          targetOpacity: 1
        })
        opacities.value[id] = 0
      }
    })
    // 描画順：退場中（ids に無い）を先頭、その後ろに現在の ids
    const leaving = order.value.filter(id => !ids.includes(id) && anims.has(id))
    order.value = [...leaving, ...ids]
  },
  { immediate: true }
)

const { onBeforeRender } = useLoop()
onBeforeRender(({ delta, elapsed }) => {
  // 環全体を自動公転（衛星と同様）。傾きは外側グループが固定で担う。
  if (spinRef.value) spinRef.value.rotation.y = elapsed * orbitSpeed

  const t = 1 - Math.exp(-SMOOTHING * delta)
  let cleanup = false
  for (const userId of order.value) {
    const a = anims.get(userId)
    if (!a) continue
    a.current.lerp(a.target, t)
    a.opacity += (a.targetOpacity - a.opacity) * t
    const group = groups.get(userId)
    if (group) group.position.copy(a.current)
    opacities.value[userId] = a.opacity
    if (a.targetOpacity === 0 && a.opacity < 0.01) cleanup = true
  }
  // 退場し切ったエントリを取り除く（Group の ref(null) で groups からも消える）
  if (cleanup) {
    for (const [userId, a] of anims) {
      if (a.targetOpacity === 0 && a.opacity < 0.01) {
        anims.delete(userId)
        delete opacities.value[userId]
      }
    }
    order.value = order.value.filter(id => anims.has(id))
  }
})
</script>

<template>
  <!-- 外側: 赤道から固定の傾きを与える / 内側(spinRef): 自動公転 -->
  <TresGroup :rotation="[VIEWER_TILT, 0, 0]">
    <TresGroup ref="spinRef">
      <TresGroup
        v-for="userId in order"
        :key="userId"
        :ref="setGroupRef(userId)"
      >
        <ViewerBillboard :user-id="userId" :opacity="opacities[userId] ?? 0" />
      </TresGroup>
    </TresGroup>
  </TresGroup>
</template>
