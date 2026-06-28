import { buildFilePath, buildFileThumbnailPath } from '/@/lib/apis'
import { useStampsStore } from '/@/store/entities/stamps'

export const useDanmakuSparkle = (
  showSparkle: (stampElement: HTMLElement) => void
) => {
  const { stampsMap } = useStampsStore()

  const sparkle = (stampId: string) => {
    const fileId = stampsMap.value.get(stampId)?.fileId
    const imageUrl = fileId ? buildFileThumbnailPath(fileId) : ''
    const originalImageUrl = fileId ? buildFilePath(fileId) : ''

    const stampImage = document.createElement('img')
    stampImage.src = imageUrl
    stampImage.decoding = 'async'
    stampImage.loading = 'lazy'
    stampImage.style.width = '24px'
    let fallbackToOriginal = false
    stampImage.addEventListener('error', () => {
      if (fallbackToOriginal || originalImageUrl.length === 0) return
      fallbackToOriginal = true
      stampImage.src = originalImageUrl
    })
    stampImage.addEventListener('load', () => {
      showSparkle(stampImage)
    })

    return stampImage
  }

  return { sparkle }
}
