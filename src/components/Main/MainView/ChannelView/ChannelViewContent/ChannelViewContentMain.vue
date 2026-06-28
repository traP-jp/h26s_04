<template>
  <div :class="$style.container">
    <div ref="canvasContainerRef" :class="$style.canvasContainer">
      <TresCanvas clear-color="#00000000">
        <SkyCameraRig :radius="cameraRadius" />
        <TresAmbientLight :intensity="1" />
        <TresDirectionalLight :position="lightPos" :intensity="1" />
        <TresGroup :position="currentCenter">
          <TresGroup :scale="[currentScale, currentScale, currentScale]">
            <MessageSphere :messages="displayMessages" />
          </TresGroup>
          <ChannelSatellites
            v-if="!isParentTransitioning"
            :channel-id="channelId"
            :select-channel="selectChannel"
          />
        </TresGroup>
        <TresGroup
          v-if="parentCenter"
          :position="parentCenter"
          :scale="[
            PARENT_TRANSITION_SCALE,
            PARENT_TRANSITION_SCALE,
            PARENT_TRANSITION_SCALE
          ]"
        >
          <MessageSphere :messages="parentMessages" />
        </TresGroup>
      </TresCanvas>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { Pin } from '@traptitech/traq'
import type { Message } from '@traptitech/traq'

import { computed, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'

import { TresCanvas } from '@tresjs/core'
import { Vector3 } from 'three'

import ChannelSatellites from '/@/components/3d/ChannelSatellites.vue'
import MessageSphere from '/@/components/3d/MessageSphere.vue'
import SkyCameraRig from '/@/components/3d/SkyCameraRig.vue'
import type { MessageScrollerInstance } from '/@/components/Main/MainView/MessagesScroller/MessagesScroller.vue'
import useChannelPath from '/@/composables/useChannelPath'
import { FOV_MAX, useSkyCamera } from '/@/composables/useSkyCamera'
import { useOpenLink } from '/@/composables/useOpenLink'
import { useSatelliteTransition } from '/@/composables/useSatelliteTransition'
import { constructChannelPath } from '/@/router'
import { useChannelsStore } from '/@/store/entities/channels'
import { useMessagesStore } from '/@/store/entities/messages'
import type { ChannelId, MessageId } from '/@/types/entity-ids'

import useChannelMessageFetcher from './composables/useChannelMessageFetcher'

const props = defineProps<{
  channelId: ChannelId
  entryMessageId?: MessageId
  pinnedMessages: Pin[]
}>()

const DEFAULT_FOV = 70
const CAMERA_RADIUS = 90
const MESSAGE_SPHERE_RADIUS = 40
const CHANNEL_SCALE = 1
const PARENT_TRANSITION_SCALE = 1.8
const PARENT_TRANSITION_FOV = 58
const PARENT_TRANSITION_MS = 1250
const PARENT_DESTINATION_OFFSET = {
  forward: 420,
  up: 560,
  right: 220
}
const PARENT_ORBIT_CONTROL_OFFSET = {
  forward: 110,
  up: 760,
  right: -260
}

const lightPos = new Vector3(5, 5, 5)
const router = useRouter()
const { channelsMap } = useChannelsStore()
const { channelIdToLink, channelIdToPathString } = useChannelPath()
const {
  camPositionAt,
  focusTarget,
  getViewUp,
  moveFocusTo,
  setFocusTarget,
  targetFov
} = useSkyCamera()

const canvasContainerRef = shallowRef<HTMLDivElement>()
const scrollerRef = canvasContainerRef as unknown as ReturnType<
  typeof shallowRef<MessageScrollerInstance | undefined>
>
const { fetchLatestMessagesPreview, messageIds } = useChannelMessageFetcher(
  scrollerRef,
  props
)

const { getMessageRef } = useMessagesStore()
const messages = computed(() =>
  messageIds.value
    .map(id => getMessageRef(id).value)
    .filter((m): m is Message => m !== undefined)
)
const parentMessages = ref<Message[]>([])
const messageOverride = ref<Message[] | null>(null)
const displayMessages = computed(() => messageOverride.value ?? messages.value)
const currentCenter = shallowRef(new Vector3())
const currentScale = ref(CHANNEL_SCALE)
const cameraRadius = ref(CAMERA_RADIUS)
const parentCenter = shallowRef<Vector3 | null>(null)
const isParentTransitioning = ref(false)

const cameraRadiusForSphereScale = (scale: number) =>
  CAMERA_RADIUS + MESSAGE_SPHERE_RADIUS * (scale - CHANNEL_SCALE)

const getParentChannel = () => {
  const parentId = channelsMap.value.get(props.channelId)?.parentId
  if (!parentId) return null

  const parentPath = channelIdToPathString(parentId)
  if (!parentPath) return null

  return { id: parentId, path: parentPath }
}

const getParentTransitionPath = () => {
  const origin = focusTarget.value.clone()
  const viewUp = getViewUp()
  const viewForward = origin
    .clone()
    .sub(camPositionAt(CAMERA_RADIUS))
    .normalize()
  const viewRight = new Vector3().crossVectors(viewForward, viewUp).normalize()
  const addViewOffset = (offset: typeof PARENT_DESTINATION_OFFSET) =>
    origin
      .clone()
      .addScaledVector(viewForward, offset.forward)
      .addScaledVector(viewUp, offset.up)
      .addScaledVector(viewRight, offset.right)

  return {
    nextCenter: addViewOffset(PARENT_DESTINATION_OFFSET),
    controlPoint: addViewOffset(PARENT_ORBIT_CONTROL_OFFSET)
  }
}

const startParentTransition = async () => {
  if (isParentTransitioning.value) return

  const parent = getParentChannel()
  if (!parent) return

  isParentTransitioning.value = true
  const { controlPoint, nextCenter } = getParentTransitionPath()
  parentCenter.value = nextCenter

  try {
    const fetchedParentMessages = await fetchLatestMessagesPreview(parent.id)
    parentMessages.value = fetchedParentMessages
    cameraRadius.value = cameraRadiusForSphereScale(PARENT_TRANSITION_SCALE)
    targetFov.value = PARENT_TRANSITION_FOV
    await moveFocusTo(nextCenter, PARENT_TRANSITION_MS, controlPoint)

    messageOverride.value = fetchedParentMessages
    currentCenter.value = nextCenter.clone()
    currentScale.value = PARENT_TRANSITION_SCALE
    parentCenter.value = null
    parentMessages.value = []
    await router.push(constructChannelPath(parent.path))
  } catch {
    parentCenter.value = null
    parentMessages.value = []
  } finally {
    isParentTransitioning.value = false
  }
}

watch(targetFov, fov => {
  if (fov < FOV_MAX) return
  void startParentTransition()
})

watch(
  () => props.channelId,
  () => {
    if (isParentTransitioning.value) return

    currentCenter.value = new Vector3()
    parentCenter.value = null
    parentMessages.value = []
    messageOverride.value = null
    currentScale.value = CHANNEL_SCALE
    cameraRadius.value = CAMERA_RADIUS
    setFocusTarget(currentCenter.value)
    targetFov.value = DEFAULT_FOV
  },
  { immediate: true }
)

watch([messages, messageOverride], ([currentMessages, override]) => {
  if (!override) return
  if (currentMessages.length !== override.length) return
  if (currentMessages.some((message, i) => message.id !== override[i]?.id)) {
    return
  }
  messageOverride.value = null
  currentScale.value = CHANNEL_SCALE
  cameraRadius.value = CAMERA_RADIUS
})

// 子チャンネル衛星のタップ時の遷移（router 依存のため canvas 外のここで処理する）
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
