<script setup lang="ts">
import { Billboard, Html } from '@tresjs/cientos'

import UserIcon from '/@/components/UI/UserIcon.vue'
import type { UserId } from '/@/types/entity-ids'

// アバターの DOM サイズ（px）
const ICON_SIZE = 40
// Message カードと揃えた距離係数。Html transform 上で距離に応じてサイズが連動する
// （大きいほど近く＝大きく描画）。
const DISTANCE_FACTOR = 15

withDefaults(
  defineProps<{
    userId: UserId
    // 入退場フェード用の不透明度（0〜1）。親 ViewerSphere が毎フレーム更新する。
    opacity?: number
  }>(),
  { opacity: 1 }
)
</script>

<template>
  <!-- Billboard: 毎フレームカメラへ正対させる。内側の Html transform で
       距離に応じてサイズが連動する（Message カードと同じ方式）。 -->
  <Billboard>
    <Html transform :distance-factor="DISTANCE_FACTOR" pointer-events="none">
      <div :class="$style.viewer" :style="{ opacity }">
        <UserIcon :user-id="userId" :size="ICON_SIZE" prevent-modal />
      </div>
    </Html>
  </Billboard>
</template>

<style lang="scss" module>
.viewer {
  pointer-events: none;
  user-select: none;
}
</style>
