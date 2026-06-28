<script setup lang="ts">
import type { Message } from '@traptitech/traq'

import { ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'

import { TresCanvas } from '@tresjs/core'
import { Vector3 } from 'three'

import MessageSphere from '/@/components/3d/MessageSphere.vue'
import SkyCameraRig from '/@/components/3d/SkyCameraRig.vue'
import StarfieldScene from '/@/components/3d/StarfieldScene.vue'
import useChannelPath from '/@/composables/useChannelPath'
import { useSkyCamera } from '/@/composables/useSkyCamera'
import apis from '/@/lib/apis'
import { useChannelTree } from '/@/store/domain/channelTree'
import { useMessagesView } from '/@/store/domain/messagesView'
import { useChannelsStore } from '/@/store/entities/channels'
import { useMessagesStore } from '/@/store/entities/messages'
import useInitialFetch from '/@/views/composables/useInitialFetch'

const lightPos = new Vector3(5, 5, 5)

const { onPointerDown, onPointerMove, onPointerUp, onWheel } = useSkyCamera()

const route = useRoute()
const { channelPathStringToId } = useChannelPath()
const { channelTree } = useChannelTree()
const { fetchChannels } = useChannelsStore()
const { extendMessagesMap } = useMessagesStore()
const { renderMessageContent } = useMessagesView()

const RECENT_MESSAGE_LIMIT = 48

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
    RECENT_MESSAGE_LIMIT,
    undefined,
    undefined,
    undefined,
    undefined,
    'desc'
  )
  const fetched = [...res.data].reverse()
  extendMessagesMap(fetched)
  messages.value = fetched
  await Promise.all(fetched.map(msg => renderMessageContent(msg.id)))
})
</script>

<template>
  <div
    style="width: 100vw; height: 100vh"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @wheel.prevent="onWheel"
  >
    <TresCanvas clear-color="#000004">
      <SkyCameraRig :radius="90" />
      <TresAmbientLight :intensity="1" />
      <TresDirectionalLight :position="lightPos" :intensity="1" />
      <StarfieldScene />
      <MessageSphere :messages="messages" />
    </TresCanvas>
  </div>
</template>
