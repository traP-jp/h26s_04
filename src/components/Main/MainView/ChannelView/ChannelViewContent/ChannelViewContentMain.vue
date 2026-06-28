<template>
  <div :class="$style.container">
    <div ref="canvasContainerRef" :class="$style.canvasContainer">
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
    <MessageInput
      :class="$style.input"
      :channel-id="channelId"
      :typing-users="typingUsers"
      :show-to-new-message-button="false"
    />
  </div>
</template>

<script lang="ts" setup>
import type { Pin } from '@traptitech/traq'
import type { Message } from '@traptitech/traq'

import { computed, shallowRef } from 'vue'

import { TresCanvas } from '@tresjs/core'
import { Vector3 } from 'three'

import ChannelSatellites from '/@/components/3d/ChannelSatellites.vue'
import MessageSphere from '/@/components/3d/MessageSphere.vue'
import SkyCameraRig from '/@/components/3d/SkyCameraRig.vue'
import MessageInput from '/@/components/Main/MainView/MessageInput/MessageInput.vue'
import type { MessageScrollerInstance } from '/@/components/Main/MainView/MessagesScroller/MessagesScroller.vue'
import useChannelPath from '/@/composables/useChannelPath'
import { useOpenLink } from '/@/composables/useOpenLink'
import { useSatelliteTransition } from '/@/composables/useSatelliteTransition'
import { useMessagesStore } from '/@/store/entities/messages'
import type { ChannelId, UserId } from '/@/types/entity-ids'

import useChannelMessageFetcher from './composables/useChannelMessageFetcher'

const props = defineProps<{
  channelId: ChannelId
  entryMessageId?: string
  pinnedMessages: Pin[]
  typingUsers: UserId[]
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

// 子チャンネル衛星のタップ時の遷移（router 依存のため canvas 外のここで処理する）
const { channelIdToLink } = useChannelPath()
const { openLink } = useOpenLink()
const { playTransition } = useSatelliteTransition()
const selectChannel = (channelId: ChannelId, event: PointerEvent) => {
  const link = channelIdToLink(channelId)
  if (!link) return
  // openLink の第3引数（router.push 直前のフック）で遷移演出を差し込めるようにしておく
  openLink(event, link, () => playTransition(channelId))
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

.input {
  flex-shrink: 0;
}
</style>
