<template>
  <h2 :class="$style.title">
    <div :class="$style.text">
      <span :class="$style.currentHash">#</span>
      <span v-for="(ancestor, i) in ancestorsPath" :key="i">
        <router-link :to="ancestor.link">{{
          isMobile ? ancestor.name[0] : ancestor.name
        }}</router-link>
        <span :data-is-primary="$boolAttr(pathInfoList.length <= 1)">/</span>
      </span>
      <span>{{ currentChannelLastPath }}</span>
    </div>
  </h2>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

import useChannelPath from '/@/composables/useChannelPath'
import useResponsive from '/@/composables/useResponsive'
import { constructChannelPath } from '/@/router'

const { isMobile } = useResponsive()

const props = withDefaults(
  defineProps<{
    iconString?: string
    iconName?: string
    iconMdi?: boolean
    channelId: string
  }>(),
  {
    iconMdi: false
  }
)

const { channelIdToPath } = useChannelPath()

type ChannelPathInfo = {
  name: string
  link: string
}
/** 現在のチャンネルに至るまでのフルパスたち */
const pathInfoList = computed(
  (): ChannelPathInfo[] =>
    channelIdToPath(props.channelId)?.map((p, i, arr) => {
      const path = arr.slice(0, i + 1)
      return {
        name: p,
        link: constructChannelPath(path.join('/'))
      }
    }) ?? []
)

const ancestorsPath = computed(() => pathInfoList.value.slice(0, -1))
const currentChannelLastPath = computed(
  () => pathInfoList.value.at(-1)?.name ?? ''
)
</script>

<style lang="scss" module>
.title {
  @include color-ui-primary;
  display: flex;
  align-items: center;
  flex: 1;
  height: 100%;
  // 中身のtext-overflow: ellipsis用
  min-width: 0;
  justify-content: flex-end;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.2;
  margin-right: 0.125rem;
}

.icon {
  margin-right: 6px;
  flex-shrink: 0;
}

.iconString {
  margin-right: 0.125rem;
  user-select: none;
}

.text {
  overflow: hidden;
  white-space: nowrap;
  overflow: auto;
}

.container {
  @include color-ui-primary;
  height: 100%;
  word-break: keep-all;
  white-space: nowrap;
}
.ancestor {
  @include color-ui-secondary-inactive;
  @include size-body1;
  cursor: pointer;
  &:hover {
    @include color-ui-secondary;
  }
}
.ancestorSeparator {
  @include color-ui-secondary-inactive;
  &[data-is-primary] {
    @include color-ui-primary-inactive;
  }
  @include size-body1;
  margin: 0 0.125rem;
  user-select: none;
}
.current {
  @include size-h1;
  margin: 0 0.125rem;
}
.currentHash {
  @include size-h1;
  user-select: none;
  margin-right: 0.125rem;
}
.ancestorHash {
  @include color-ui-primary-inactive;
  @include size-h1;
  margin-right: 0.125rem;
  user-select: none;
  &:hover {
    @include color-ui-primary;
  }
}
</style>
