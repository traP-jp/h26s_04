<script setup lang="ts">
import type { Message } from '@traptitech/traq'

import { computed } from 'vue'

import { Html } from '@tresjs/cientos'
import { Matrix4, Quaternion, Vector3 } from 'three'

import MessageElement from '/@/components/Main/MainView/MessageElement/MessageElement.vue'
import { fibonacciSphere } from '/@/lib/three/fibonacciSphere'

const SPHERE_RADIUS = 32
// 経線（上方向）を作るためのワールド上方向と、極での縮退時に使う代替参照軸
const WORLD_UP = new Vector3(0, 1, 0)
const FALLBACK_UP = new Vector3(0, 0, 1)

const props = defineProps<{
  messages: Message[]
}>()

const positions = computed(() =>
  fibonacciSphere(props.messages.length).map(v =>
    v.multiplyScalar(SPHERE_RADIUS)
  )
)

// 球面に貼った地球儀の文字のように、各カードを接平面へ沿わせて静的に固定する。
// 上方向はワールド上方向の接平面投影（経線方向）。カメラを動かしても回転しない。
const quaternions = computed(() => {
  const z = new Vector3()
  const y = new Vector3()
  const x = new Vector3()
  const m = new Matrix4()
  return positions.value.map(p => {
    // 法線（カード面 +Z＝読み取り面）は半径方向の外向き＝カメラ側
    z.copy(p).normalize()
    // y = WORLD_UP を接平面へ投影（経線方向）
    y.copy(WORLD_UP).addScaledVector(z, -WORLD_UP.dot(z))
    if (y.lengthSq() < 1e-6) {
      // 極付近: 法線がワールド上方向とほぼ平行な縮退。別軸を投影して回避する
      y.copy(FALLBACK_UP).addScaledVector(z, -FALLBACK_UP.dot(z))
    }
    y.normalize()
    // 右手系（makeBasis は z = x×y を要求するため x = y×z とする）
    x.crossVectors(y, z).normalize()
    m.makeBasis(x, y, z)
    return new Quaternion().setFromRotationMatrix(m)
  })
})
</script>

<template>
  <TresGroup
    v-for="(msg, i) in messages"
    :key="msg.id"
    :position="positions[i]"
    :quaternion="quaternions[i]"
  >
    <Html transform occlude :distance-factor="15">
      <div :class="$style.card">
        <MessageElement :message-id="msg.id" open-modal-on-body-click />
      </div>
    </Html>
  </TresGroup>
</template>

<style lang="scss" module>
.card {
  background: var(--theme-background-primary-default);
  border-radius: 50px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.35);
  padding: 4px;
  pointer-events: auto;
  user-select: none;
  width: 320px;
}
</style>
