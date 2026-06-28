<template>
  <div :class="$style.container" :style="containerStyle">
    <img
      v-if="imageUrl.length > 0"
      :class="$style.img"
      :src="imageUrl"
      :alt="name"
      :title="!withoutTitle ? name : undefined"
      loading="lazy"
      decoding="async"
      draggable="false"
      @contextmenu="noContextMenu ? $event.preventDefault() : undefined"
      @error="onImageError"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'

import { buildFilePath, buildFileThumbnailPath } from '/@/lib/apis'
import { useStampsStore } from '/@/store/entities/stamps'
import type { StampId } from '/@/types/entity-ids'

const props = withDefaults(
  defineProps<{
    stampId: StampId
    size?: number
    useOriginalImage?: boolean
    withoutTitle?: boolean
    noContextMenu?: boolean
  }>(),
  {
    size: 24,
    useOriginalImage: false,
    withoutTitle: false
  }
)

const { stampsMap } = useStampsStore()
const fallbackToOriginal = ref(false)

const name = computed(
  () => stampsMap.value.get(props.stampId)?.name ?? 'unknown stamp'
)
const fileId = computed(() => stampsMap.value.get(props.stampId)?.fileId)
const imageUrl = computed(() => {
  if (!fileId.value) return ''
  if (props.useOriginalImage || fallbackToOriginal.value) {
    return buildFilePath(fileId.value)
  }
  return buildFileThumbnailPath(fileId.value)
})

const containerStyle = computed(() => ({
  width: `${props.size / 16}rem`,
  height: `${props.size / 16}rem`
}))

watch([fileId, () => props.useOriginalImage], () => {
  fallbackToOriginal.value = false
})

const onImageError = () => {
  if (props.useOriginalImage || fallbackToOriginal.value) return
  fallbackToOriginal.value = true
}
</script>

<style lang="scss" module>
.container {
  object-fit: contain;
  user-select: none;
  contain: content; // strictだと縦横比がうまくいかない
}

.img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  margin: auto;
  object-fit: contain;
  html[data-stamp-edge='true'] & {
    filter: drop-shadow(0.1px 0.1px 0 rgb(255, 255, 255, 0.1))
      drop-shadow(0.1px -0.1px 0 rgb(255, 255, 255, 0.1))
      drop-shadow(-0.1px 0.1px 0 rgb(255, 255, 255, 0.1))
      drop-shadow(-0.1px -0.1px 0 rgb(255, 255, 255, 0.1));
  }
}
</style>
