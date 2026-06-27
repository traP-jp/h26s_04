import type { ShallowRef } from 'vue'
import { computed, watch } from 'vue'

import useBoxSize from '/@/composables/dom/useBoxSize'
import { unrefElement } from '/@/lib/dom/unrefElement'

import type { MessageScrollerInstance } from '../MessagesScroller.vue'

const MAX_COUNT = 20

const useFetchLimit = (
  scrollerRef: ShallowRef<MessageScrollerInstance | undefined>,
  messageHeight: number
) => {
  const { height } = useBoxSize(
    computed(() => unrefElement(scrollerRef) ?? null),
    false
  )

  const fetchLimit = computed(() => {
    if (height.value === undefined) return MAX_COUNT
    return Math.min(Math.ceil(height.value / messageHeight), MAX_COUNT)
  })

  const waitHeightResolved = new Promise<void>(resolve => {
    if (unrefElement(scrollerRef) === undefined) {
      resolve()
      return
    }
    const stop = watch(
      height,
      newHeight => {
        if (newHeight !== undefined) {
          stop()
          resolve()
        }
      },
      { immediate: true }
    )
  })

  return { fetchLimit, waitHeightResolved }
}

export default useFetchLimit
