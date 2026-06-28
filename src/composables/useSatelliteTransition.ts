import type { ChannelId } from '/@/types/entity-ids'

/**
 * 子チャンネル衛星クリック時の「遷移演出」を担うコンポーザブル。
 *
 * 現状は何もせず即座に解決する空実装。
 * `ChannelSatellites` のクリックハンドラは
 * `openLink(event, link, () => playTransition(childId))` の第3引数（router.push 直前に
 * await されるフック）として本関数を渡している。
 * 将来ここに useSkyCamera などを用いたカメラズーム/フェード演出を実装すれば、
 * 呼び出し側を一切変更せずに「クリック→演出→遷移」を実現できる。
 */
export const useSatelliteTransition = () => {
  const playTransition = async (_channelId: ChannelId): Promise<void> => {
    // TODO(issue11+): 子チャンネルへの遷移アニメーションをここに実装する
  }

  return { playTransition }
}

export default useSatelliteTransition
