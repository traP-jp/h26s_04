<template>
  <div :class="$style.container">
    <div
      ref="canvasContainerRef"
      :class="$style.canvasContainer"
      @pointerdown="onUserInteract"
      @wheel="onUserInteract"
      @click="onUserInteract"
    >
      <TresCanvas clear-color="#00000000">
        <SkyCameraRig :radius="90" />
        <TresAmbientLight :intensity="1" />
        <TresDirectionalLight :position="lightPos" :intensity="1" />
        <MessageSphere :messages="messages" />
        <ChannelSatellites
          :channel-id="channelId"
          :select-channel="selectChannel"
        />
      </TresCanvas>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { Pin } from '@traptitech/traq'
import type { Message } from '@traptitech/traq'

import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'

import { TresCanvas } from '@tresjs/core'
import { Vector3 } from 'three'

import ChannelSatellites from '/@/components/3d/ChannelSatellites.vue'
import MessageSphere from '/@/components/3d/MessageSphere.vue'
import SkyCameraRig from '/@/components/3d/SkyCameraRig.vue'
import type { MessageScrollerInstance } from '/@/components/Main/MainView/MessagesScroller/MessagesScroller.vue'
import useChannelPath from '/@/composables/useChannelPath'
import { useLatestFocusTour } from '/@/composables/useLatestFocusTour'
import { useOpenLink } from '/@/composables/useOpenLink'
import { useSatelliteTransition } from '/@/composables/useSatelliteTransition'
import { useMessagesStore } from '/@/store/entities/messages'
import type { ChannelId, MessageId } from '/@/types/entity-ids'

import useChannelMessageFetcher from './composables/useChannelMessageFetcher'

const props = defineProps<{
  channelId: ChannelId
  entryMessageId?: MessageId
  pinnedMessages: Pin[]
}>()

const lightPos = new Vector3(5, 5, 5)

const canvasContainerRef = shallowRef<HTMLDivElement>()
const scrollerRef = canvasContainerRef as unknown as ReturnType<
  typeof shallowRef<MessageScrollerInstance | undefined>
>
const { messageIds } = useChannelMessageFetcher(scrollerRef, props)

const { getMessageRef } = useMessagesStore()
const messages = computed(() =>
  messageIds.value
    .map(id => getMessageRef(id).value)
    .filter((m): m is Message => m !== undefined)
)

// 「最新から順にフォーカス」モード（issue #66）。ヘッダーの再生ボタンから操作するため、
// 現在の messages をここで共有コンポーザブルへ登録しておく。
const { isPlaying, stop, setMessages } = useLatestFocusTour()
watch(messages, m => setMessages(m), { immediate: true })
// 再生中にユーザーがカード／衛星などへ触れたらモードを解除して通常操作へ返す
const onUserInteract = () => {
  if (isPlaying.value) stop()
}
// チャンネル離脱時に rAF / タイマーを後始末し、登録した messages も解除する
// （非チャンネル画面ではツールバーの再生ボタンを出さないため）
onBeforeUnmount(() => {
  stop()
  setMessages([])
})

// 子チャンネル衛星のタップ時の遷移（router 依存のため canvas 外のここで処理する）
const { channelIdToLink } = useChannelPath()
const { openLink } = useOpenLink()
const { playTransition } = useSatelliteTransition()
const selectChannel = (
  channelId: ChannelId,
  event: PointerEvent,
  focusAngle: number
) => {
  const link = channelIdToLink(channelId)
  if (!link) return
  // openLink の第3引数（router.push 直前のフック）で遷移演出を差し込めるようにしておく。
  // focusAngle はクリックした衛星の向き（カメラを正対させてからズームインする）
  openLink(event, link, () => playTransition(channelId, focusAngle))
}
</script>

<style lang="scss" module>
.container {
  display: flex;
  flex: 1 1;
  flex-direction: column;
  position: relative;
  height: 100%;
  width: 100%;
}

.canvasContainer {
  flex: 1 1;
  width: 100%;
  overflow: hidden;
  // cientos <Html> のラベルは巨大な z-index（既定 16777271）を持つ。
  // ここで stacking context を作り、その z-index を canvas 内に閉じ込めて
  // ヘッダー/入力欄/サイドバー/モーダルより手前に出ないようにする。
  position: relative;
  isolation: isolate;
}
</style>
