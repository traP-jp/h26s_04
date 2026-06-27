<template>
  <div :class="$style.container">
    <div
      :class="[
        $style.selector,
        { [$style.scrollbarHidden]: isNavigationClosed }
      ]"
    >
      <DesktopToolBox />
      <ChannelTreeComponent
        :id="allPanelId"
        :channels="topLevelChannels"
        role="tabpanel"
      />
    </div>
    <div
      ref="navigationRef"
      :class="[$style.navigations, { [$style.hidden]: isNavigationClosed }]"
    >
      <!--<NavigationContent
        :current-navigation="navigationSelectorState.currentNavigation"
      />-->
      <transition name="fade-bottom">
        <EphemeralNavigationContent
          v-if="ephemeralNavigationSelectorState.currentNavigation"
          :class="$style.ephemeralNavigation"
          :current-ephemeral-navigation="
            ephemeralNavigationSelectorState.currentNavigation
          "
        />
      </transition>
    </div>
    <div
      ref="navigationResizerRef"
      :class="$style.resizer"
      @pointerdown="onDragStart"
      @pointermove="onDragging"
      @pointerup="onDragEnd"
      @pointercancel="onDragEnd"
      @dblclick="initializeNavigationWidth"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, toRaw } from 'vue'

import DesktopToolBox from '/@/components/Main/NavigationBar/DesktopToolBox.vue'
import EphemeralNavigationContent from '/@/components/Main/NavigationBar/EphemeralNavigationContent/EphemeralNavigationContent.vue'
import { randomString } from '/@/lib/basic/randomString'
import { filterTrees } from '/@/lib/basic/tree'
import { useBrowserSettings } from '/@/store/app/browserSettings'
import { useChannelTree } from '/@/store/domain/channelTree'
import { useNavigationLayoutStore } from '/@/store/ui/navigationLayout'

import ChannelTreeComponent from './ChannelList/ChannelTree.vue'
import useNavigation from './composables/useNavigation'
import useNavigationResizer from './composables/useNavigationResizer'

const { ephemeralNavigationSelectorState } = useNavigation()

const {
  isNavigationClosed,
  initializeNavigationWidth,
  navigationRef,
  resizerRef: navigationResizerRef
} = useNavigationLayoutStore()

const { onDragStart, onDragging, onDragEnd } = useNavigationResizer()

const allPanelId = randomString()

const { channelTree } = useChannelTree()
const { showArchivedChannels } = useBrowserSettings()

const topLevelChannels = computed(() =>
  filterTrees(
    toRaw(channelTree.value.children),
    channel => showArchivedChannels.value || !channel.archived
  )
)
</script>

<style lang="scss" module>
$ephemeralNavigationSideMargin: 8px;
$ephemeralNavigationMinHeight: 64px;

.container {
  @include color-ui-primary;
  position: relative;
  display: flex;
  width: fit-content;
  height: 100%;
  // background: var(--specific-navigation-bar-desktop-background);
}
.selector {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex-shrink: 0;
  overflow: {
    x: hidden;
    y: auto;
  }
  scrollbar-gutter: stable;
}
.navigations {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.ephemeralNavigation {
  width: #{calc(100% - #{$ephemeralNavigationSideMargin * 2})};
  margin: 0 $ephemeralNavigationSideMargin;
  flex: 0 1 $ephemeralNavigationMinHeight;
}
.hidden {
  display: none;
}
.scrollbarHidden {
  scrollbar-width: none;
}
.resizer {
  width: 3px;
  height: 100%;
  position: absolute;
  z-index: $z-index-sidebar;
  right: -1px;
  top: 0;
  background-color: transparent;
  cursor: e-resize;

  background-color: $theme-accent-primary-default;

  opacity: 0;
  transition: opacity 125ms linear;

  &:hover {
    opacity: 0.7;
    transition: opacity 100ms ease-out 350ms;
  }

  &:active {
    opacity: 1;
    transition: opacity 100ms ease-out;
  }

  // ヒット領域を拡張
  &::before {
    content: '';
    position: absolute;
    left: -2px;
    right: -12px;
    top: 0;
    bottom: 0;
    background-color: transparent;
  }
}
</style>
