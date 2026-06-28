<script setup lang="ts">
import type { Message } from '@traptitech/traq'

import { onBeforeUnmount, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'

import { TresCanvas } from '@tresjs/core'
import { Vector3 } from 'three'

import MessageSphere from '/@/components/3d/MessageSphere.vue'
import SkyCameraRig from '/@/components/3d/SkyCameraRig.vue'
import StarfieldScene from '/@/components/3d/StarfieldScene.vue'
import useChannelPath from '/@/composables/useChannelPath'
import { useLatestFocusTour } from '/@/composables/useLatestFocusTour'
import { useSkyCamera } from '/@/composables/useSkyCamera'
import apis from '/@/lib/apis'
import { useChannelTree } from '/@/store/domain/channelTree'
import { useMessagesView } from '/@/store/domain/messagesView'
import { useChannelsStore } from '/@/store/entities/channels'
import { useMessagesStore } from '/@/store/entities/messages'
import useInitialFetch from '/@/views/composables/useInitialFetch'

const lightPos = new Vector3(5, 5, 5)

const { onPointerDown, onPointerMove, onPointerUp, onWheel } = useSkyCamera()
const { isPlaying, canPlay, setMessages, toggle, stop } = useLatestFocusTour()

// 再生中にユーザー操作（ドラッグ／ホイール／カードクリック等）があったらモードを解除する。
// トグルボタン自身の操作（data-tour-toggle）は除外する。
const maybeStopTour = (e: Event) => {
  if (!isPlaying.value) return
  if (e.target instanceof Element && e.target.closest('[data-tour-toggle]'))
    return
  stop()
}
const onContainerPointerDown = (e: PointerEvent) => {
  maybeStopTour(e)
  onPointerDown(e)
}
const onContainerWheel = (e: WheelEvent) => {
  maybeStopTour(e)
  onWheel(e)
}

// 画面遷移時に rAF / タイマーを後始末する
onBeforeUnmount(() => stop())

const route = useRoute()
const { channelPathStringToId } = useChannelPath()
const { channelTree } = useChannelTree()
const { fetchChannels } = useChannelsStore()
const { extendMessagesMap } = useMessagesStore()
const { renderMessageContent } = useMessagesView()

const messages = ref<Message[]>([])

// eslint-disable-next-line @typescript-eslint/no-empty-function
useInitialFetch(() => {})

watchEffect(async () => {
  const channelParam = route.params['channel'] as string
  if (!channelParam) return

  // track channelTree.children before any await so watchEffect re-runs when tree is populated
  if (channelTree.value.children.length === 0) {
    fetchChannels()
    return
  }

  const channelId = channelPathStringToId(channelParam)
  const res = await apis.getMessages(
    channelId,
    50,
    undefined,
    undefined,
    undefined,
    undefined,
    'desc'
  )
  const fetched = [...res.data].reverse()
  extendMessagesMap(fetched)
  messages.value = fetched
  setMessages(fetched)
  await Promise.all(fetched.map(msg => renderMessageContent(msg.id)))
})
</script>

<template>
  <div
    style="position: relative; width: 100vw; height: 100vh"
    @pointerdown="onContainerPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @wheel.prevent="onContainerWheel"
    @click="maybeStopTour"
  >
    <button
      type="button"
      data-tour-toggle
      data-sky-camera-ignore
      :disabled="!canPlay"
      :class="$style.tourToggle"
      @click="toggle()"
    >
      {{ isPlaying ? '停止' : '最新から順に見る' }}
    </button>
    <TresCanvas clear-color="#000004">
      <SkyCameraRig :radius="90" />
      <TresAmbientLight :intensity="1" />
      <TresDirectionalLight :position="lightPos" :intensity="1" />
      <StarfieldScene />
      <MessageSphere :messages="messages" />
    </TresCanvas>
  </div>
</template>

<style lang="scss" module>
.tourToggle {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 0.875rem;
  cursor: pointer;
  backdrop-filter: blur(4px);

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.22);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
}
</style>
