import { computed } from 'vue'

import useResponsive from '/@/composables/useResponsive'
import { MainViewComponentState, useMainViewStore } from '/@/store/ui/mainView'

const useSidebar = () => {
  const { currentMainViewComponentState: state, isSidebarOpen } =
    useMainViewStore()
  const { isMobile } = useResponsive()

  /**
   * サイドバーが表示されている必要があるか
   *
   * モバイルの場合は引き出し開始時点で表示する必要があるため特殊な扱いとなる
   */
  const shouldShowSidebar = computed(() => true)

  const shouldShowHiddenSidebar = computed(() => false)

  const openSidebar = () => {
    state.value = isMobile.value
      ? MainViewComponentState.SidebarAppearingAuto
      : MainViewComponentState.SidebarShown
  }
  const closeSidebar = () => {
    state.value = isMobile.value
      ? MainViewComponentState.SidebarDisappearingAuto
      : MainViewComponentState.Hidden
  }
  return {
    isSidebarOpen,
    shouldShowSidebar,
    openSidebar,
    closeSidebar,
    shouldShowHiddenSidebar
  }
}

export default useSidebar
