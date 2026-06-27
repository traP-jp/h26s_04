import type { ChannelStats } from '@traptitech/traq'

import { computed, onUnmounted, ref, watch } from 'vue'

import useMittListener from '/@/composables/utils/useMittListener'
import apis from '/@/lib/apis'
import { wsListener } from '/@/lib/websocket'
import { messageMitt } from '/@/store/entities/messages'
import type { ChannelId } from '/@/types/entity-ids'

const STAMP_STATS_REFETCH_DELAY_MS = 500

const useChannelStats = (props: { channelId: ChannelId }) => {
  const channelStats = ref<ChannelStats>()
  const isLoading = ref(false)
  const isFailed = ref(false)
  let fetchId = 0
  let stampStatsRefetchTimeout: ReturnType<typeof setTimeout> | undefined

  const fetch = async ({ clear = false } = {}) => {
    const currentFetchId = ++fetchId
    if (clear) {
      channelStats.value = undefined
    }
    isLoading.value = true
    isFailed.value = false

    try {
      const { data } = await apis.getChannelStats(props.channelId, true)
      if (currentFetchId !== fetchId) return

      channelStats.value = data
    } catch (e) {
      if (currentFetchId !== fetchId) return

      // eslint-disable-next-line no-console
      console.error(e)
      channelStats.value = undefined
      isFailed.value = true
    } finally {
      if (currentFetchId === fetchId) {
        isLoading.value = false
      }
    }
  }

  const requestStampStatsRefetch = () => {
    if (stampStatsRefetchTimeout !== undefined) {
      clearTimeout(stampStatsRefetchTimeout)
    }

    stampStatsRefetchTimeout = setTimeout(() => {
      stampStatsRefetchTimeout = undefined
      fetch()
    }, STAMP_STATS_REFETCH_DELAY_MS)
  }

  const updateTotalMessageCount = (getNextCount: (count: number) => number) => {
    if (channelStats.value === undefined) {
      fetch()
      return
    }

    channelStats.value = {
      ...channelStats.value,
      totalMessageCount: getNextCount(channelStats.value.totalMessageCount)
    }
  }

  watch(
    () => props.channelId,
    () => {
      fetch({ clear: true })
    },
    { immediate: true }
  )

  useMittListener(messageMitt, 'addMessage', ({ message }) => {
    if (message.channelId !== props.channelId) return

    updateTotalMessageCount(count => count + 1)
  })
  useMittListener(messageMitt, 'deleteMessage', ({ channelId }) => {
    if (channelId === undefined) {
      if (!isLoading.value) {
        fetch()
      }
      return
    }

    if (channelId !== props.channelId) return

    const shouldRefetchStampStats = channelStats.value !== undefined
    updateTotalMessageCount(count => Math.max(0, count - 1))
    if (shouldRefetchStampStats) {
      requestStampStatsRefetch()
    }
  })
  useMittListener(messageMitt, 'reconnect', () => {
    fetch()
  })
  useMittListener(wsListener, 'MESSAGE_STAMPED', requestStampStatsRefetch)
  useMittListener(wsListener, 'MESSAGE_UNSTAMPED', requestStampStatsRefetch)

  onUnmounted(() => {
    if (stampStatsRefetchTimeout !== undefined) {
      clearTimeout(stampStatsRefetchTimeout)
    }
  })

  const totalMessageCount = computed(
    () => channelStats.value?.totalMessageCount
  )
  const stampStats = computed(() => channelStats.value?.stamps)

  return {
    totalMessageCount,
    stampStats,
    isLoading,
    isFailed
  }
}

export default useChannelStats
