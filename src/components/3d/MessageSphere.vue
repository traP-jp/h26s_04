<script setup lang="ts">
import type { Message } from '@traptitech/traq'

import { computed } from 'vue'

import { Html } from '@tresjs/cientos'

import MessageElement from '/@/components/Main/MainView/MessageElement/MessageElement.vue'
import { fibonacciSphere } from '/@/lib/three/fibonacciSphere'

const SPHERE_RADIUS = 40

const props = defineProps<{
  messages: Message[]
}>()

const positions = computed(() =>
  fibonacciSphere(props.messages.length).map(v =>
    v.multiplyScalar(SPHERE_RADIUS)
  )
)
</script>

<template>
  <TresGroup
    v-for="(msg, i) in messages"
    :key="msg.id"
    :position="positions[i]"
  >
    <Html transform occlude :distance-factor="15">
      <div :class="$style.card">
        <MessageElement :message-id="msg.id" />
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
  width: 320px;
}
</style>
