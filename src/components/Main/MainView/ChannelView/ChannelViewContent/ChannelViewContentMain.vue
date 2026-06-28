<template>
  <div :class="$style.container">
    <div ref="canvasContainerRef" :class="$style.canvasContainer">
      <TresCanvas clear-color="#00000000">
        <SkyCameraRig :radius="cameraRadius" />
        <TresAmbientLight :intensity="1" />
        <TresDirectionalLight :position="lightPos" :intensity="1" />
        <TresGroup :position="currentCenter">
          <TresGroup :scale="currentScaleVector">
            <MessageSphere :messages="displayMessages" />
          </TresGroup>
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

import { computed, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'

import { TresCanvas } from '@tresjs/core'
import { Vector3 } from 'three'

import ChannelSatellites from '/@/components/3d/ChannelSatellites.vue'
import MessageSphere from '/@/components/3d/MessageSphere.vue'
import SkyCameraRig from '/@/components/3d/SkyCameraRig.vue'
import type { MessageScrollerInstance } from '/@/components/Main/MainView/MessagesScroller/MessagesScroller.vue'
import useChannelPath from '/@/composables/useChannelPath'
import { useOpenLink } from '/@/composables/useOpenLink'
import { useSatelliteTransition } from '/@/composables/useSatelliteTransition'
import { FOV_MAX, useSkyCamera } from '/@/composables/useSkyCamera'
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

const toScaleVector = (scale: number) => new Vector3(scale, scale, scale)

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
const currentScaleVector = computed(() => toScaleVector(currentScale.value))
const parentScale = ref(PARENT_TRANSITION_SCALE)
const parentScaleVector = computed(() => toScaleVector(parentScale.value))
const cameraRadius = ref(CAMERA_RADIUS)
const parentCenter = shallowRef<Vector3 | null>(null)
const parentTransitionChannelId = ref<ChannelId | null>(null)
const parentTransitionSourceChannelId = ref<ChannelId | null>(null)
const parentTransitionSourceAngle = ref<number>()
const isParentTransitioning = ref(false)

const resetParentTransitionPreview = () => {
  parentCenter.value = null
  parentMessages.value = []
  parentTransitionChannelId.value = null
  parentTransitionSourceChannelId.value = null
  parentTransitionSourceAngle.value = undefined
  parentScale.value = PARENT_TRANSITION_SCALE
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
  settleControlPoint: Vector3
) =>
  new Promise<void>(resolve => {
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
        focusTarget.value = nextCenter.clone()
        camPhi.value = PARENT_CAMERA_SIDE_PHI
        camTheta.value = toTheta
        currentScale.value = CHILD_CHANNEL_SCALE
        parentScale.value = PARENT_TRANSITION_SCALE
        targetFov.value = PARENT_TRANSITION_FOV
        cameraRadius.value = toCameraRadius
        resolve()
      }
    }
    requestAnimationFrame(tick)
  })

const startParentTransition = async () => {
  if (isParentTransitioning.value) return

  const parent = getParentChannel()
  if (!parent) return

  isParentTransitioning.value = true
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
    parentMessages.value = fetchedParentMessages

    await animateParentTransition(
      nextCenter,
      arcControlPoint,
      settleControlPoint
    )

    messageOverride.value = fetchedParentMessages
    currentCenter.value = nextCenter.clone()
    currentScale.value = CHANNEL_SCALE
    resetParentTransitionPreview()
    await router.push(constructChannelPath(parent.path))
  } catch {
    resetParentTransitionPreview()
    currentScale.value = CHANNEL_SCALE
    cameraRadius.value = CAMERA_RADIUS
    targetFov.value = DEFAULT_FOV
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
    resetParentTransitionPreview()
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
  resetParentTransitionPreview()
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
