import { FOV_MAX, useSkyCamera } from '/@/composables/useSkyCamera'
import type { ChannelId } from '/@/types/entity-ids'

const FOV_MAX_RESTORE_MARGIN = 1
// まず衛星へ正対するようカメラを回す時間 → それからズームインする時間
const ORIENT_MS = 460
const ZOOM_IN_MS = 460
// 遷移後に新チャンネルへ引いて見せる（ズームアウト）時間
const ZOOM_OUT_MS = 460
// ズームイン時の FOV 倍率（小さいほど強く寄る）
const ZOOM_FACTOR = 0.35
// 天頂角（camPhi）の安全域。useSkyCamera の PHI_MIN/MAX に合わせる
const PHI_MIN = 0.18
const PHI_MAX = Math.PI - 0.18

const prefersReduced = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches

// 多重発火を防ぐ（連打しても演出が重ならないように）
let active = false

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

// 角度の最短差分（-π〜π）。カメラの方位（camTheta）を最短経路で回すために使う
const shortestAngleDelta = (from: number, to: number) => {
  let d = (to - from) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

const animate = (durationMs: number, onStep: (e: number) => void) =>
  new Promise<void>(resolve => {
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      onStep(easeInOutCubic(t))
      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })

/**
 * 子チャンネル衛星クリック時の「遷移演出」を担うコンポーザブル。
 *
 * `ChannelSatellites` のタップ → 親 `ChannelViewContentMain` の `selectChannel` →
 * `openLink(event, link, () => playTransition(childId, focusAngle))` の第3引数
 * （router.push 直前に await されるフック）として呼ばれる。
 *
 * 演出: クリックした衛星が画面中央（原点の向こう側）に来るよう共有カメラ（useSkyCamera）を
 * 回し、FOV を絞って衛星へズームイン → （解決後に呼び出し側が router.push）→
 * 新チャンネルへ FOV を戻して引いて見せる（ズームアウト）。オーバーレイは使わない。
 *
 * @param focusAngle クリックした衛星の赤道面上のワールド角（ラジアン）。省略時は寄りのみ。
 */
export const useSatelliteTransition = () => {
  const { camTheta, camPhi, targetFov, dragging } = useSkyCamera()

  const playTransition = async (
    _channelId: ChannelId,
    focusAngle?: number
  ): Promise<void> => {
    // モーション抑制設定 or 多重発火時は演出せず即遷移する
    if (prefersReduced || active) return
    active = true

    // 演出中は自動回転・慣性を止める（dragging=true で tick が前進しない）
    dragging.value = true

    const startTheta = camTheta.value
    const startPhi = camPhi.value
    const startFov = targetFov.value
    const restoreFov =
      startFov >= FOV_MAX ? FOV_MAX - FOV_MAX_RESTORE_MARGIN : startFov

    // 衛星が画面中央に来るのは、カメラが原点を挟んで衛星の反対側にいるとき
    // （カメラは常に原点を向くため）。赤道面に水平化して正対させる。
    const targetTheta =
      focusAngle === undefined ? startTheta : focusAngle + Math.PI
    const targetPhi = focusAngle === undefined ? startPhi : Math.PI / 2
    const thetaDelta = shortestAngleDelta(startTheta, targetTheta)
    const clampedTargetPhi = Math.max(PHI_MIN, Math.min(PHI_MAX, targetPhi))
    const zoomFov = startFov * ZOOM_FACTOR

    // ① まず衛星に正対するようカメラを回す（ズームはまだしない）
    if (focusAngle !== undefined) {
      await animate(ORIENT_MS, e => {
        camTheta.value = startTheta + thetaDelta * e
        camPhi.value = startPhi + (clampedTargetPhi - startPhi) * e
      })
    }

    // ② それから衛星へズームイン
    await animate(ZOOM_IN_MS, e => {
      targetFov.value = startFov + (zoomFov - startFov) * e
    })

    // ここで解決 → 呼び出し側が router.push（新チャンネルへ）。
    // 遷移後、最大ズームの状態から FOV を戻して新チャンネルを引いて見せる。
    window.setTimeout(() => {
      void animate(ZOOM_OUT_MS, e => {
        targetFov.value = zoomFov + (restoreFov - zoomFov) * e
      }).finally(() => {
        targetFov.value = restoreFov
        dragging.value = false
        active = false
      })
    }, 60)
  }

  return { playTransition }
}

export default useSatelliteTransition
