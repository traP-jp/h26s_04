<script setup lang="ts">
import type { Message } from '@traptitech/traq'

import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { TresCanvas } from '@tresjs/core'
import { useEventListener } from '@vueuse/core'
import { Vector3 } from 'three'

import MessageSphere from '/@/components/3d/MessageSphere.vue'
import SkyCameraRig from '/@/components/3d/SkyCameraRig.vue'
import StarfieldScene from '/@/components/3d/StarfieldScene.vue'
import useChannelPath from '/@/composables/useChannelPath'
import { FOV_MAX, useSkyCamera } from '/@/composables/useSkyCamera'
import apis from '/@/lib/apis'
import { useChannelTree } from '/@/store/domain/channelTree'
import { useMessagesView } from '/@/store/domain/messagesView'
import { useChannelsStore } from '/@/store/entities/channels'
import { useMessagesStore } from '/@/store/entities/messages'
import useInitialFetch from '/@/views/composables/useInitialFetch'

const DEFAULT_FOV = 70
const FOV_MAX_RESTORE_MARGIN = 1
const PARENT_TRANSITION_FOV = 72
const PARENT_TRANSITION_MS = 850
const PARENT_TRANSITION_OFFSET = 180
const constructThreeDPath = (channelPath: string) => `/3d/${channelPath}`

const lightPos = new Vector3(5, 5, 5)

const {
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel: onSkyWheel,
  focusTarget,
  getViewUp,
  moveFocusTo,
  setFocusTarget,
  targetFov
} = useSkyCamera()

const setFovBelowParentTrigger = () => {
  targetFov.value = FOV_MAX - FOV_MAX_RESTORE_MARGIN
}

const route = useRoute()
const router = useRouter()
const { channelPathStringToId } = useChannelPath()
const { channelTree } = useChannelTree()
const { fetchChannels } = useChannelsStore()
const { extendMessagesMap } = useMessagesStore()
const { renderMessageContent } = useMessagesView()

const messages = ref<Message[]>([])
const parentMessages = ref<Message[]>([])
const currentCenter = shallowRef(new Vector3())
const parentCenter = shallowRef<Vector3 | null>(null)
const isParentTransitioning = ref(false)
let parentTransitionToken = 0
let pendingParentRoutePath: string | null = null
let isUnmounted = false

// eslint-disable-next-line @typescript-eslint/no-empty-function
useInitialFetch(() => {})

const toChannelPath = (param: unknown) => {
  if (Array.isArray(param)) return param.join('/')
  return typeof param === 'string' ? param : ''
}

const fetchMessagesByChannelPath = async (channelPath: string) => {
  if (channelTree.value.children.length === 0) {
    await fetchChannels()
  }

  const channelId = channelPathStringToId(channelPath)
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
  await Promise.all(fetched.map(msg => renderMessageContent(msg.id)))
  return fetched
}

let routeFetchId = 0
watch(
  () => route.params['channel'],
  async channelParam => {
    const fetchId = ++routeFetchId
    const channelPath = toChannelPath(channelParam)
    if (isParentTransitioning.value) {
      if (pendingParentRoutePath === channelPath) return

      parentTransitionToken++
      pendingParentRoutePath = null
      isParentTransitioning.value = false
      parentCenter.value = null
      parentMessages.value = []
    }

    currentCenter.value = new Vector3()
    parentCenter.value = null
    parentMessages.value = []
    setFocusTarget(currentCenter.value)
    targetFov.value = DEFAULT_FOV

    if (!channelPath) {
      messages.value = []
      return
    }

    const fetched = await fetchMessagesByChannelPath(channelPath)
    if (fetchId !== routeFetchId || isParentTransitioning.value) return
    messages.value = fetched
  },
  { immediate: true }
)

const getParentChannelPath = () => {
  const channelPath = toChannelPath(route.params['channel'])
  const parts = channelPath.split('/').filter(Boolean)
  if (parts.length <= 1) return null
  return parts.slice(0, -1).join('/')
}

const startParentTransition = async () => {
  if (isParentTransitioning.value) return

  const parentPath = getParentChannelPath()
  if (!parentPath) {
    setFovBelowParentTrigger()
    return
  }

  const transitionToken = ++parentTransitionToken
  const isCurrentTransition = () =>
    !isUnmounted &&
    transitionToken === parentTransitionToken &&
    isParentTransitioning.value
  isParentTransitioning.value = true
  pendingParentRoutePath = null
  const nextCenter = focusTarget.value
    .clone()
    .add(getViewUp().multiplyScalar(PARENT_TRANSITION_OFFSET))
  parentCenter.value = nextCenter

  try {
    const fetchedParentMessages = await fetchMessagesByChannelPath(parentPath)
    if (!isCurrentTransition()) return

    parentMessages.value = fetchedParentMessages
    targetFov.value = PARENT_TRANSITION_FOV
    await moveFocusTo(nextCenter, PARENT_TRANSITION_MS)
    if (!isCurrentTransition()) return

    messages.value = fetchedParentMessages
    currentCenter.value = nextCenter.clone()
    parentCenter.value = null
    parentMessages.value = []
    pendingParentRoutePath = parentPath
    await router.push({
      path: constructThreeDPath(parentPath)
    })
  } catch {
    if (isCurrentTransition()) {
      parentCenter.value = null
      parentMessages.value = []
      targetFov.value = DEFAULT_FOV
    }
  } finally {
    if (transitionToken === parentTransitionToken) {
      pendingParentRoutePath = null
      isParentTransitioning.value = false
    }
  }
}

const onThreeDPointerDown = (e: PointerEvent) => {
  if (isParentTransitioning.value) return
  onPointerDown(e)
}

const onThreeDPointerMove = (e: PointerEvent) => {
  if (isParentTransitioning.value) return
  onPointerMove(e)
}

const onThreeDPointerUp = () => {
  onPointerUp()
}

const onThreeDWheel = (e: WheelEvent) => {
  if (isParentTransitioning.value) return

  e.preventDefault()
  onSkyWheel(e)
}

watch(targetFov, fov => {
  if (fov < FOV_MAX || isParentTransitioning.value) return
  void startParentTransition()
})

useEventListener(window, 'wheel', onThreeDWheel, {
  capture: true,
  passive: false
})

onBeforeUnmount(() => {
  isUnmounted = true
  parentTransitionToken++
  pendingParentRoutePath = null
  setFocusTarget(focusTarget.value)
})
</script>

<template>
  <div
    style="width: 100vw; height: 100vh"
    @pointerdown="onThreeDPointerDown"
    @pointermove="onThreeDPointerMove"
    @pointerup="onThreeDPointerUp"
    @pointercancel="onThreeDPointerUp"
  >
    <TresCanvas clear-color="#000004">
      <SkyCameraRig :radius="90" />
      <TresAmbientLight :intensity="1" />
      <TresDirectionalLight :position="lightPos" :intensity="1" />
      <StarfieldScene />
      <TresGroup :position="currentCenter">
        <MessageSphere :messages="messages" />
      </TresGroup>
      <TresGroup v-if="parentCenter" :position="parentCenter">
        <MessageSphere :messages="parentMessages" />
      </TresGroup>
    </TresCanvas>
  </div>
</template>
