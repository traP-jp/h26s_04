import { computed } from 'vue'

import { useLatestFocusTour } from '/@/composables/useLatestFocusTour'
import { useOpenLink } from '/@/composables/useOpenLink'
import useToggle from '/@/composables/utils/useToggle'
import { useCommandPalette } from '/@/store/app/commandPalette'

interface Tool {
  iconName: string
  iconMdi: boolean
  /**
   * clickイベントと中央クリックでのmousedownイベントで呼ばれる
   */
  onClick: (event: MouseEvent) => void
}

const useToolBox = () => {
  const {
    value: isServicesShown,
    close: closeServices,
    toggle: toggleServices
  } = useToggle(false)
  const { openLink } = useOpenLink()

  const { openCommandPalette } = useCommandPalette()
  const openSettings = (e: MouseEvent) => {
    openLink(e, '/settings')
  }

  // 「最新から順にフォーカス」モード（issue #66）。3D 球面を表示中（canPlay）のみツールに出す
  const {
    isPlaying: isTourPlaying,
    canPlay: canPlayTour,
    toggle: toggleTour
  } = useLatestFocusTour()

  const tools = computed(() => {
    const tools: Tool[] = []
    if (canPlayTour.value) {
      tools.push({
        iconName: isTourPlaying.value ? 'stop' : 'play',
        iconMdi: true,
        onClick: () => toggleTour()
      })
    }
    if (window.traQConfig.enableSearch) {
      tools.push({
        iconName: 'search',
        iconMdi: true,
        onClick: () => openCommandPalette('search')
      })
    }
    if (window.traQConfig.services && window.traQConfig.services.length > 0) {
      tools.push({
        iconName: 'apps',
        iconMdi: true,
        onClick: toggleServices
      })
    }
    tools.push({
      iconName: 'cog',
      iconMdi: true,
      onClick: openSettings
    })
    return tools
  })

  return {
    isServicesShown,
    closeServices,
    toggleServices,
    tools
  }
}

export default useToolBox
