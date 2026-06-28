<template>
  <div :class="$style.container">
    <div ref="canvasContainerRef" :class="$style.canvasContainer">
      <TresCanvas clear-color="#00000000">
        <SkyCameraRig :radius="cameraRadius" />
        <TresAmbientLight :intensity="1" />
        <TresDirectionalLight :position="lightPos" :intensity="1" />
        <TresGroup :position="currentCenter">
          <TresGroup :scale="currentScaleVector">
            <MessageSphere :key="messageSphereKey" :messages="displayMessages" />
          </TresGroup>
          <ViewerSphere
            v-if="!isParentTransitioning"
            :user-ids="activeViewingUsers"
          />
          <ChannelSatellites
            v-if="!isParentTransitioning"
            :channel-id="channelId"
            :select-channel="selectChannel"
          />
        </TresGroup>
        <TresGroup v-if="parentCenter" :position="parentCenter">
          <TresGroup :scale="parentScaleVector">
            <MessageSphere :messages="parentMessages" />
          </TresGroup>
          <ChannelSatellites
            v-if="parentTransitionChannelId"
            :channel-id="parentTransitionChannelId"
            :select-channel="selectChannel"
            :interactive="false"
            paused
            :show-labels="false"
            :highlighted-channel-id="
              parentTransitionSourceChannelId ?? undefined
            "
            :highlighted-angle="parentTransitionSourceAngle"
          />
        </TresGroup>
      </TresCanvas>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { Pin } from '@traptitech/traq'
import type { Message } from '@traptitech/traq'

import { computed, onBeforeUnmount, ref, shallowRef, toRef, watch } from 'vue'
import { useRouter } from 'vue-router'

import { TresCanvas } from '@tresjs/core'
import { Vector3 } from 'three'

import ChannelSatellites from '/@/components/3d/ChannelSatellites.vue'
import MessageSphere from '/@/components/3d/MessageSphere.vue'
import SkyCameraRig from '/@/components/3d/SkyCameraRig.vue'
import ViewerSphere from '/@/components/3d/ViewerSphere.vue'
import type { MessageScrollerInstance } from '/@/components/Main/MainView/MessagesScroller/MessagesScroller.vue'
import useChannelPath from '/@/composables/useChannelPath'
import useCurrentViewers from '/@/composables/useCurrentViewers'
import { useOpenLink } from '/@/composables/useOpenLink'
import { useSatelliteTransition } from '/@/composables/useSatelliteTransition'
import { FOV_MAX, useSkyCamera } from '/@/composables/useSkyCamera'
import useMittListener from '/@/composables/utils/useMittListener'
import { wsListener } from '/@/lib/websocket'
import { constructChannelPath } from '/@/router'
import { useMessagesView } from '/@/store/domain/messagesView'
import { useChannelsStore } from '/@/store/entities/channels'
import { messageMitt, useMessagesStore } from '/@/store/entities/messages'
import type { ChannelId, MessageId } from '/@/types/entity-ids'

import useChannelMessageFetcher from './composables/useChannelMessageFetcher'

const RECENT_MESSAGE_LIMIT = 48

const props = defineProps<{
  channelId: ChannelId
  entryMessageId?: MessageId
  pinnedMessages: Pin[]
}>()

const DEFAULT_FOV = 70
const CAMERA_RADIUS = 90
const FOV_MAX_RESTORE_MARGIN = 1
const MESSAGE_SPHERE_RADIUS = 40
const CHANNEL_SCALE = 1
const CHILD_ORBIT_RADIUS = 100
const CHILD_CHANNEL_SCALE = 0.1
const PARENT_TRANSITION_SCALE = CHANNEL_SCALE
const PARENT_TRANSITION_FOV = 70
const PARENT_OVERVIEW_FOV = 82
const PARENT_OVERVIEW_CAMERA_RADIUS = CAMERA_RADIUS + CHILD_ORBIT_RADIUS * 0.65
const PARENT_TRANSITION_MS = 1750
const PARENT_ARC_UP_OFFSET = CHILD_ORBIT_RADIUS * 0.72
const PARENT_ARC_LEFT_OVERSHOOT = CHILD_ORBIT_RADIUS * 0.42
const PARENT_ARC_FORWARD_OFFSET = CHILD_ORBIT_RADIUS * 0.22
const PARENT_START_OUTSIDE_ANGLE = Math.PI / 5
const PARENT_CAMERA_TOP_PHI = (Math.PI * 5) / 12
const PARENT_CAMERA_SIDE_PHI = Math.PI / 2
const PARENT_CAMERA_THETA_SWEEP = -Math.PI / 4
const CHILD_TRANSITION_RESET_DELAY_MS = 700

const toScaleVector = (scale: number) => new Vector3(scale, scale, scale)

// 閲覧者をビルボードとして球の周囲に表示する（3D コンポーネントは channelId だけで自己完結）
const { activeViewingUsers } = useCurrentViewers(toRef(props, 'channelId'))

const lightPos = new Vector3(5, 5, 5)
const router = useRouter()
const { channelsMap } = useChannelsStore()
const { channelIdToLink, channelIdToPathString } = useChannelPath()
const {
  camPhi,
  camTheta,
  camPositionAt,
  focusTarget,
  getViewUp,
  setFocusTarget,
  targetFov
} = useSkyCamera()

const canvasContainerRef = shallowRef<HTMLDivElement>()
const scrollerRef = canvasContainerRef as unknown as ReturnType<
  typeof shallowRef<MessageScrollerInstance | undefined>
>
const {
  fetchLatestMessagesPreview,
  isLoading,
  messageIds
} = useChannelMessageFetcher(scrollerRef, props, {
  fetchLimit: RECENT_MESSAGE_LIMIT,
  receiveIncomingMessages: true
})

const { fetchMessage, getMessageRef } = useMessagesStore()
const { renderMessageContent } = useMessagesView()
const displayedMessageIds = ref<MessageId[]>([])

function shuffle(items: readonly MessageId[]) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const item = result[i]
    const shuffledItem = result[j]
    if (item === undefined || shuffledItem === undefined) continue
    result[i] = shuffledItem
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
const parentMessages = ref<Message[]>([])
const messageOverride = ref<Message[] | null>(null)
const messageOverrideChannelId = ref<ChannelId | null>(null)
const displayMessages = computed(() => messageOverride.value ?? messages.value)
const messageSphereKey = computed(() =>
  displayMessages.value.map(message => message.id).join(':')
)
const currentCenter = shallowRef(new Vector3())
const currentScale = ref(CHANNEL_SCALE)
const currentScaleVector = computed(() => toScaleVector(currentScale.value))
const parentScale = ref(PARENT_TRANSITION_SCALE)
const parentScaleVector = computed(() => toScaleVector(parentScale.value))
const cameraRadius = ref(CAMERA_RADIUS)
const parentCenter = shallowRef<Vector3 | null>(null)
const parentTransitionChannelId = ref<ChannelId | null>(null)
const parentTransitionSourceChannelId = ref<ChannelId | null>(null)
const parentTransitionSourceAngle = ref<number>()
const isParentTransitioning = ref(false)
const isChildTransitioning = ref(false)
let parentTransitionToken = 0
let pendingParentRouteChannelId: ChannelId | null = null
let isUnmounted = false
let childTransitionResetTimer: number | undefined

const resetParentTransitionPreview = () => {
  parentCenter.value = null
  parentMessages.value = []
  parentTransitionChannelId.value = null
  parentTransitionSourceChannelId.value = null
  parentTransitionSourceAngle.value = undefined
  parentScale.value = PARENT_TRANSITION_SCALE
}

const clearMessageOverride = () => {
  messageOverride.value = null
  messageOverrideChannelId.value = null
  currentScale.value = CHANNEL_SCALE
  cameraRadius.value = CAMERA_RADIUS
  resetParentTransitionPreview()
}

const setFovBelowParentTrigger = () => {
  targetFov.value = FOV_MAX - FOV_MAX_RESTORE_MARGIN
}

const cameraRadiusForSphereScale = (scale: number) =>
  CAMERA_RADIUS + MESSAGE_SPHERE_RADIUS * (scale - CHANNEL_SCALE)

const getViewRight = (viewForward: Vector3, viewUp: Vector3) => {
  const viewRight = new Vector3().crossVectors(viewForward, viewUp)
  if (viewRight.lengthSq() < 1e-6) {
    viewRight.set(1, 0, 0)
  }
  return viewRight.normalize()
}

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
  const viewLeft = getViewRight(viewForward, viewUp).negate()
  const horizontalForward = viewForward.clone()
  horizontalForward.y = 0
  if (horizontalForward.lengthSq() < 1e-6) {
    horizontalForward.set(0, 0, 1)
  }
  horizontalForward.normalize()
  viewLeft.y = 0
  if (viewLeft.lengthSq() < 1e-6) {
    viewLeft.set(1, 0, 0)
  }
  viewLeft.normalize()
  const parentDirection = viewLeft
    .clone()
    .multiplyScalar(Math.cos(PARENT_START_OUTSIDE_ANGLE))
    .addScaledVector(horizontalForward, -Math.sin(PARENT_START_OUTSIDE_ANGLE))
    .normalize()

  // 現在チャンネルを、左手前にある親チャンネルの子衛星軌道上に置いた状態から始める。
  // 親は最初から固定位置にいるが、開始時のカメラからは画角外になる角度に置く。
  const nextCenter = origin
    .clone()
    .addScaledVector(parentDirection, CHILD_ORBIT_RADIUS)
  const sourceOffset = origin.clone().sub(nextCenter)
  const arcControlPoint = origin
    .clone()
    .addScaledVector(viewLeft, CHILD_ORBIT_RADIUS + PARENT_ARC_LEFT_OVERSHOOT)
    .addScaledVector(viewUp, PARENT_ARC_UP_OFFSET)
    .addScaledVector(viewForward, PARENT_ARC_FORWARD_OFFSET)
  const settleControlPoint = nextCenter
    .clone()
    .addScaledVector(viewLeft, PARENT_ARC_LEFT_OVERSHOOT)
    .addScaledVector(viewUp, PARENT_ARC_UP_OFFSET * 0.45)
    .addScaledVector(viewForward, PARENT_ARC_FORWARD_OFFSET * 0.35)

  return {
    nextCenter,
    sourceOffset,
    arcControlPoint,
    settleControlPoint
  }
}

const smootherStep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

const lerpNumber = (from: number, to: number, t: number) =>
  from + (to - from) * t

const cubicBezier = (
  from: Vector3,
  control1: Vector3,
  control2: Vector3,
  to: Vector3,
  t: number
) => {
  const invT = 1 - t
  return from
    .clone()
    .multiplyScalar(invT * invT * invT)
    .add(control1.clone().multiplyScalar(3 * invT * invT * t))
    .add(control2.clone().multiplyScalar(3 * invT * t * t))
    .add(to.clone().multiplyScalar(t * t * t))
}

const animateParentTransition = (
  nextCenter: Vector3,
  arcControlPoint: Vector3,
  settleControlPoint: Vector3,
  shouldContinue: () => boolean
) =>
  new Promise<boolean>(resolve => {
    const start = performance.now()
    const fromFocus = focusTarget.value.clone()
    const fromScale = currentScale.value
    const fromParentScale = parentScale.value
    const fromFov = targetFov.value
    const fromCameraRadius = cameraRadius.value
    const fromPhi = camPhi.value
    const fromTheta = camTheta.value
    const toTheta = fromTheta + PARENT_CAMERA_THETA_SWEEP
    const toCameraRadius = cameraRadiusForSphereScale(PARENT_TRANSITION_SCALE)
    const tick = (now: number) => {
      if (!shouldContinue()) {
        resolve(false)
        return
      }

      const t = Math.min(1, (now - start) / PARENT_TRANSITION_MS)
      const eased = smootherStep(t)
      const overview = Math.sin(Math.PI * eased) ** 2

      focusTarget.value = cubicBezier(
        fromFocus,
        arcControlPoint,
        settleControlPoint,
        nextCenter,
        eased
      )
      const sidePhi = lerpNumber(fromPhi, PARENT_CAMERA_SIDE_PHI, eased)
      camPhi.value = lerpNumber(sidePhi, PARENT_CAMERA_TOP_PHI, overview)
      camTheta.value = lerpNumber(fromTheta, toTheta, eased)
      currentScale.value = lerpNumber(fromScale, CHILD_CHANNEL_SCALE, eased)
      parentScale.value = lerpNumber(
        fromParentScale,
        PARENT_TRANSITION_SCALE,
        eased
      )
      targetFov.value =
        lerpNumber(fromFov, PARENT_TRANSITION_FOV, eased) +
        (PARENT_OVERVIEW_FOV - PARENT_TRANSITION_FOV) * overview
      cameraRadius.value =
        lerpNumber(fromCameraRadius, toCameraRadius, eased) +
        (PARENT_OVERVIEW_CAMERA_RADIUS - toCameraRadius) * overview

      if (t < 1) requestAnimationFrame(tick)
      else {
        if (!shouldContinue()) {
          resolve(false)
          return
        }

        focusTarget.value = nextCenter.clone()
        camPhi.value = PARENT_CAMERA_SIDE_PHI
        camTheta.value = toTheta
        currentScale.value = CHILD_CHANNEL_SCALE
        parentScale.value = PARENT_TRANSITION_SCALE
        targetFov.value = PARENT_TRANSITION_FOV
        cameraRadius.value = toCameraRadius
        resolve(true)
      }
    }
    requestAnimationFrame(tick)
  })

const startParentTransition = async () => {
  if (isParentTransitioning.value) return

  const parent = getParentChannel()
  if (!parent) {
    setFovBelowParentTrigger()
    return
  }

  const transitionToken = ++parentTransitionToken
  const isCurrentTransition = () =>
    !isUnmounted &&
    transitionToken === parentTransitionToken &&
    isParentTransitioning.value
  isParentTransitioning.value = true
  pendingParentRouteChannelId = null
  const { arcControlPoint, nextCenter, settleControlPoint, sourceOffset } =
    getParentTransitionPath()
  parentCenter.value = nextCenter
  parentTransitionChannelId.value = parent.id
  parentTransitionSourceChannelId.value = props.channelId
  parentScale.value = CHILD_CHANNEL_SCALE

  parentTransitionSourceAngle.value =
    Math.abs(sourceOffset.x) + Math.abs(sourceOffset.z) > 1e-6
      ? Math.atan2(sourceOffset.z, sourceOffset.x)
      : undefined

  try {
    const fetchedParentMessages = await fetchLatestMessagesPreview(parent.id)
    if (!isCurrentTransition()) return

    parentMessages.value = fetchedParentMessages

    const completed = await animateParentTransition(
      nextCenter,
      arcControlPoint,
      settleControlPoint,
      isCurrentTransition
    )
    if (!completed || !isCurrentTransition()) return

    messageOverride.value = fetchedParentMessages
    messageOverrideChannelId.value = parent.id
    currentCenter.value = nextCenter.clone()
    currentScale.value = CHANNEL_SCALE
    resetParentTransitionPreview()
    pendingParentRouteChannelId = parent.id
    await router.push(constructChannelPath(parent.path))
  } catch {
    if (isCurrentTransition()) {
      resetParentTransitionPreview()
      currentScale.value = CHANNEL_SCALE
      cameraRadius.value = CAMERA_RADIUS
      targetFov.value = DEFAULT_FOV
    }
  } finally {
    if (transitionToken === parentTransitionToken) {
      pendingParentRouteChannelId = null
      isParentTransitioning.value = false
    }
  }
}

watch(targetFov, fov => {
  if (fov < FOV_MAX || isParentTransitioning.value) return
  void startParentTransition()
})

watch(
  () => props.channelId,
  channelId => {
    if (isParentTransitioning.value) {
      if (pendingParentRouteChannelId === channelId) return

      parentTransitionToken++
      pendingParentRouteChannelId = null
      isParentTransitioning.value = false
    }

    currentCenter.value = new Vector3()
    resetParentTransitionPreview()
    messageOverride.value = null
    messageOverrideChannelId.value = null
    currentScale.value = CHANNEL_SCALE
    cameraRadius.value = CAMERA_RADIUS
    setFocusTarget(currentCenter.value)
    if (!isChildTransitioning.value) {
      targetFov.value = DEFAULT_FOV
    }
  },
  { immediate: true }
)

watch([isLoading, messages], ([loading], [wasLoading]) => {
  const override = messageOverride.value
  if (!override) return
  if (props.channelId !== messageOverrideChannelId.value) return
  if (loading) return
  if (!wasLoading && messages.value.length === 0 && override.length > 0) {
    return
  }

  clearMessageOverride()
})

onBeforeUnmount(() => {
  isUnmounted = true
  parentTransitionToken++
  pendingParentRouteChannelId = null
  if (childTransitionResetTimer !== undefined) {
    window.clearTimeout(childTransitionResetTimer)
  }
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
  openLink(event, link, async () => {
    isChildTransitioning.value = true
    if (childTransitionResetTimer !== undefined) {
      window.clearTimeout(childTransitionResetTimer)
    }
    try {
      await playTransition(channelId, focusAngle)
    } finally {
      childTransitionResetTimer = window.setTimeout(() => {
        isChildTransitioning.value = false
        childTransitionResetTimer = undefined
      }, CHILD_TRANSITION_RESET_DELAY_MS)
    }
  })
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
