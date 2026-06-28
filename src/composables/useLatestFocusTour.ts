import type { Message } from '@traptitech/traq'

import { computed, ref, watch } from 'vue'

import { createSharedComposable } from '@vueuse/core'
import type { Vector3 } from 'three'

import { useSkyCamera } from '/@/composables/useSkyCamera'
import { fibonacciSphere } from '/@/lib/three/fibonacciSphere'

// 寄り具合（大きいほど弱く寄る＝カードが小さく見える）
const ZOOM_FACTOR = 0.8
// 毎フレーム目標へ詰める割合。小さいほどゆっくり滑って止まる（慣性が長く効く）
const SMOOTH = 0.02
// 1枚のカードを見せている滞留時間（ms）
const DWELL_MS = 800
// 「到達した」とみなす収束しきい値（角度: rad / FOV）
const THETA_EPS = 0.008
const PHI_EPS = 0.008
const FOV_EPS = 0.4

// useSkyCamera と同じ天頂角の安全域（極でカメラが反転しないように）
const PHI_MIN = 0.18
const PHI_MAX = Math.PI - 0.18
const clampPhi = (v: number) => Math.max(PHI_MIN, Math.min(PHI_MAX, v))

// 角度の最短差分（-π〜π）。camTheta を最短経路で回すため（useSatelliteTransition と同等）
const shortestAngleDelta = (from: number, to: number) => {
  let d = (to - from) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

/**
 * 「最新の投稿へ向かってフォーカスしていくモード」(issue #66)。
 *
 * 球面に並んだメッセージカード（MessageSphere = fibonacciSphere 順）を、
 * クリック時点の「最新-3」の投稿から最新へ向けて順にフォーカスしていく。
 * 最新に到達したら、新しい投稿が来るまで待ち、来たらそれへフォーカスする（ライブ追従）。
 *
 * カメラ演出は useSatelliteTransition の「正対＋ズームイン」と同じ狙いだが、
 * 固いイージングで止めるのではなく、毎フレーム目標へ指数スムージングで詰めることで
 * useSkyCamera のドラッグ＋慣性（DAMP）に近い「滑って止まる」手触りにする。
 *
 * 再生中は useSkyCamera の suspended=true で自動回転・慣性 tick を止め、
 * カメラはこのループが一手に駆動する。ユーザー操作で止めたい場合は呼び出し側が stop() する。
 */
const _useLatestFocusTour = () => {
  const prefersReduced = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches

  const { camTheta, camPhi, targetFov, suspended } = useSkyCamera()

  const isPlaying = ref(false)

  // 球面を描画しているホスト（ThreeDPage / ChannelViewContentMain）が現在の messages を登録する。
  // ヘッダーのボタンなど messages を持たない場所からでも toggle() できるようにするため。
  const registeredMessages = ref<Message[]>([])
  const setMessages = (messages: Message[]) => {
    registeredMessages.value = messages
  }
  const canPlay = computed(() => registeredMessages.value.length > 0)

  // 再生中のみ有効な内部状態（共有シングルトンなのでクロージャ変数で保持する）
  // dirs は MessageSphere と同じ fibonacciSphere 順（index が 1:1 対応する）
  let dirs: Vector3[] = []
  let count = 0
  let currentIndex = 0
  let targetTheta = 0
  let targetPhi = Math.PI / 2
  let baseFov = 70
  let zoomFov = baseFov * ZOOM_FACTOR
  let dwelling = false
  // 最新に到達して新しい投稿の到着を待っている状態
  let waiting = false
  let rafId = 0
  let dwellTimer = 0

  // カードの読み取り面（+Z）は球の外向き。外側から正面を見るには、カードと同じ半径方向の
  // 外側にカメラを置く（カメラは原点を向くので視線は中心ベクトルの逆向き＝カード正面を捉える）。
  const setTarget = (i: number) => {
    const dir = dirs[i]
    if (!dir) return
    targetTheta = Math.atan2(dir.z, dir.x)
    targetPhi = clampPhi(Math.acos(dir.y))
  }

  const advance = () => {
    if (!isPlaying.value) return
    if (currentIndex >= count - 1) {
      // 最新に到達。新しい投稿が来るまで待つ（messages 長さ変化の watch で再開する）
      waiting = true
      return
    }
    currentIndex++ // 最新（新しい投稿）方向へ進む
    setTarget(currentIndex)
    dwelling = false
  }

  const frame = () => {
    if (!isPlaying.value) return
    const smooth = prefersReduced ? 1 : SMOOTH

    const dTheta = shortestAngleDelta(camTheta.value, targetTheta)
    const dPhi = targetPhi - camPhi.value
    camTheta.value += dTheta * smooth
    camPhi.value = clampPhi(camPhi.value + dPhi * smooth)
    targetFov.value += (zoomFov - targetFov.value) * smooth

    // 目標へ収束したら滞留に入り、一定時間後に次（最新方向の）カードへ
    if (
      !dwelling &&
      Math.abs(dTheta) < THETA_EPS &&
      Math.abs(dPhi) < PHI_EPS &&
      Math.abs(targetFov.value - zoomFov) < FOV_EPS
    ) {
      dwelling = true
      dwellTimer = window.setTimeout(advance, DWELL_MS)
    }

    rafId = requestAnimationFrame(frame)
  }

  const start = () => {
    const messages = registeredMessages.value
    if (isPlaying.value || messages.length === 0) return
    count = messages.length
    dirs = fibonacciSphere(count)
    baseFov = targetFov.value
    zoomFov = baseFov * ZOOM_FACTOR
    isPlaying.value = true
    // 再生中は useSkyCamera の自動回転・慣性を止め、カメラをこのループが駆動する。
    // dragging ではなく suspended を使う（dragging=true だとマウス移動だけでカメラが回ってしまう）
    suspended.value = true
    // 「最新-3」から開始（投稿が4件未満なら先頭から）。ここから最新へ向けて進む
    currentIndex = Math.max(0, count - 4)
    setTarget(currentIndex)
    dwelling = false
    waiting = false
    rafId = requestAnimationFrame(frame)
  }

  const stop = () => {
    if (!isPlaying.value) return
    isPlaying.value = false
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
    if (dwellTimer) clearTimeout(dwellTimer)
    dwellTimer = 0
    // ズームを元に戻し、通常のカメラ操作（自動回転・慣性）へ返す
    targetFov.value = baseFov
    suspended.value = false
    waiting = false
  }

  const toggle = () => {
    if (isPlaying.value) stop()
    else start()
  }

  // 再生中に messages が増減したら追従する。
  // ・最新で待機中なら、新しく来た投稿（最新）へ向けて進む
  // ・スクロール途中なら、球の再レイアウト（fibonacciSphere(n)）に合わせて現在の対象を再照準する
  watch(
    () => registeredMessages.value.length,
    newCount => {
      if (!isPlaying.value) return
      if (newCount === 0) {
        stop()
        return
      }
      count = newCount
      dirs = fibonacciSphere(count)
      if (waiting) {
        waiting = false
        advance()
      } else {
        setTarget(currentIndex)
      }
    }
  )

  return { isPlaying, canPlay, setMessages, start, stop, toggle }
}

export const useLatestFocusTour = createSharedComposable(_useLatestFocusTour)

export default useLatestFocusTour
