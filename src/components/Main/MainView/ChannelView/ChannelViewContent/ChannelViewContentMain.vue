<template>
  <div :class="$style.container">
    <div ref="canvasContainerRef" :class="$style.canvasContainer">
      <TresCanvas clear-color="#00000000">
        <SkyCameraRig :radius="90" />
        <TresAmbientLight :intensity="1" />
        <TresDirectionalLight :position="lightPos" :intensity="1" />
        <MessageSphere :messages="messages" />
      </TresCanvas>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { Pin } from '@traptitech/traq'
import type { Message } from '@traptitech/traq'

import { computed, shallowRef } from 'vue'

import { TresCanvas } from '@tresjs/core'
import { Vector3 } from 'three'

import MessageSphere from '/@/components/3d/MessageSphere.vue'
import SkyCameraRig from '/@/components/3d/SkyCameraRig.vue'
import type { MessageScrollerInstance } from '/@/components/Main/MainView/MessagesScroller/MessagesScroller.vue'
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
}
</style>
