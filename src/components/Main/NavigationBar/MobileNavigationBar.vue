<template>
  <nav
    :class="$style.container"
    :data-has-ephemeral-content="
      $boolAttr(!!ephemeralNavigationSelectorState.currentNavigation)
    "
  >
    <MobileToolBox :class="$style.toolBox" />
    <ChannelTreeComponent
      :id="allPanelId"
      :class="$style.content"
      :channels="topLevelChannels"
      role="tabpanel"
    />
    <div
      v-if="ephemeralNavigationSelectorState.currentNavigation"
      :class="$style.ephemeralContent"
    >
      <EphemeralNavigationContent
        transparent
        :current-ephemeral-navigation="
          ephemeralNavigationSelectorState.currentNavigation
        "
      />
    </div>
  </nav>
</template>

<script lang="ts" setup>
import { computed, toRaw } from 'vue'

import EphemeralNavigationContent from '/@/components/Main/NavigationBar/EphemeralNavigationContent/EphemeralNavigationContent.vue'
import MobileToolBox from '/@/components/Main/NavigationBar/MobileToolBox.vue'
import { randomString } from '/@/lib/basic/randomString'
import { filterTrees } from '/@/lib/basic/tree'
import { useBrowserSettings } from '/@/store/app/browserSettings'
import { useChannelTree } from '/@/store/domain/channelTree'

import ChannelTreeComponent from './ChannelList/ChannelTree.vue'
import useNavigation from './composables/useNavigation'

const { ephemeralNavigationSelectorState } = useNavigation()

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
.container {
  display: grid;
  grid-template:
    'toolbox' min-content
    'content' 1fr;
  row-gap: 8px;
  width: 100%;
  height: 100%;
  padding: 8px 0;
  background: transparent;
  &[data-has-ephemeral-content] {
    grid-template:
      'toolbox' min-content
      'content' 2fr
      'ephemeral-content' auto;
  }
}
.toolBox,
.ephemeralContent {
  border-radius: 4px;
  overflow: hidden;
}
.toolBox {
  grid-area: toolbox;
  padding: 0 16px;
}
.content {
  grid-area: content;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}
.ephemeralContent {
  grid-area: ephemeral-content;
  padding: {
    top: 4px;
    left: 4px;
    right: 4px;
  }
}
</style>
