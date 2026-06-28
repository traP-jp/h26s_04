<template>
  <div :class="$style.container">
    <div ref="canvasContainerRef" :class="$style.canvasContainer">
      <TresCanvas clear-color="#00000000">
        <SkyCameraRig :radius="90" />
        <TresAmbientLight :intensity="1" />
        <TresDirectionalLight :position="lightPos" :intensity="1" />
        <MessageSphere :key="messageSphereKey" :messages="messages" />
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

import { computed, ref, shallowRef, watch } from 'vue'

import { TresCanvas } from '@tresjs/core'
import { Vector3 } from 'three'

import ChannelSatellites from '/@/components/3d/ChannelSatellites.vue'
import MessageSphere from '/@/components/3d/MessageSphere.vue'
import SkyCameraRig from '/@/components/3d/SkyCameraRig.vue'
import type { MessageScrollerInstance } from '/@/components/Main/MainView/MessagesScroller/MessagesScroller.vue'
import useMittListener from '/@/composables/utils/useMittListener'
import useChannelPath from '/@/composables/useChannelPath'
import { useOpenLink } from '/@/composables/useOpenLink'
import { useSatelliteTransition } from '/@/composables/useSatelliteTransition'
import { wsListener } from '/@/lib/websocket'
import { useMessagesView } from '/@/store/domain/messagesView'
import { messageMitt, useMessagesStore } from '/@/store/entities/messages'
import type { ChannelId, MessageId } from '/@/types/entity-ids'

import useChannelMessageFetcher from './composables/useChannelMessageFetcher'

const RECENT_MESSAGE_LIMIT = 48

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
const { messageIds } = useChannelMessageFetcher(scrollerRef, props, {
  fetchLimit: RECENT_MESSAGE_LIMIT,
  receiveIncomingMessages: true
})

const { fetchMessage, getMessageRef } = useMessagesStore()
const { renderMessageContent } = useMessagesView()
const displayedMessageIds = ref<MessageId[]>([])

function shuffle<T>(items: readonly T[]) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const item = result[i]!
    result[i] = result[j]!
    result[j] = item
  }
  return result
}

function insertAtRandomIndex<T>(items: T[], item: T) {
  const index = Math.floor(Math.random() * (items.length + 1))
  items.splice(index, 0, item)
}

const getCreatedAtTime = (messageId: MessageId) => {
  const message = getMessageRef(messageId).value
  if (!message) return Number.POSITIVE_INFINITY
  return new Date(message.createdAt).getTime()
}

const getOldestMessageIndex = (ids: readonly MessageId[]) => {
  let oldestIndex = 0
  let oldestTime = Number.POSITIVE_INFINITY

  ids.forEach((id, index) => {
    const createdAtTime = getCreatedAtTime(id)
    if (createdAtTime < oldestTime) {
      oldestIndex = index
      oldestTime = createdAtTime
    }
  })

  return oldestIndex
}

const addDisplayedMessageId = (ids: MessageId[], addedId: MessageId) => {
  if (ids.includes(addedId)) return

  if (ids.length < RECENT_MESSAGE_LIMIT) {
    insertAtRandomIndex(ids, addedId)
    return
  }

  const oldestIndex = getOldestMessageIndex(ids)
  ids.splice(oldestIndex, 1, addedId)
}

watch(
  () => [...messageIds.value],
  (ids, previousIds = []) => {
    if (ids.length === 0) {
      displayedMessageIds.value = []
      return
    }

    const latestIds = ids.slice(-RECENT_MESSAGE_LIMIT)
    if (previousIds.length === 0 || displayedMessageIds.value.length === 0) {
      displayedMessageIds.value = shuffle(latestIds)
      return
    }

    const idsSet = new Set(ids)
    const previousIdsSet = new Set(previousIds)
    const nextDisplayedIds = displayedMessageIds.value.filter(id =>
      idsSet.has(id)
    )
    const addedIds = ids.filter(id => !previousIdsSet.has(id))

    for (const addedId of addedIds) {
      addDisplayedMessageId(nextDisplayedIds, addedId)
    }

    displayedMessageIds.value = nextDisplayedIds
  },
  { immediate: true }
)

const showIncomingMessage = async (message: Message) => {
  if (message.channelId !== props.channelId) return

  const nextDisplayedIds = [...displayedMessageIds.value]
  addDisplayedMessageId(nextDisplayedIds, message.id)
  displayedMessageIds.value = nextDisplayedIds

  await renderMessageContent(message.id)
}

useMittListener(messageMitt, 'addMessage', async ({ message }) => {
  await showIncomingMessage(message)
})

useMittListener(wsListener, 'MESSAGE_CREATED', async ({ id }) => {
  const message = await fetchMessage({ messageId: id })
  await showIncomingMessage(message)
})

watch(
  () => props.channelId,
  () => {
    displayedMessageIds.value = []
  }
)

const messages = computed(() =>
  displayedMessageIds.value
    .map(id => getMessageRef(id).value)
    .filter((m): m is Message => m !== undefined)
)
const messageSphereKey = computed(() => displayedMessageIds.value.join(':'))

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
