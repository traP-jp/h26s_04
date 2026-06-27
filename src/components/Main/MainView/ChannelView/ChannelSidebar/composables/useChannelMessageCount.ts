import axios from 'axios'
import { ref, watch } from 'vue'

import useMittListener from '/@/composables/utils/useMittListener'
import { BASE_PATH } from '/@/lib/apis'
import { messageMitt } from '/@/store/entities/messages'
import type { ChannelId } from '/@/types/entity-ids'

type ChannelStats = {
  totalMessageCount: number
}

const fetchChannelStats = (
  channelId: ChannelId,
  excludeDeletedMessages: boolean
) =>
  axios.get<ChannelStats>(
    `${BASE_PATH}/channels/${encodeURIComponent(channelId)}/stats`,
    {
      params: {
        'exclude-deleted-messages': excludeDeletedMessages
      }
    }
  )

const useChannelMessageCount = (props: { channelId: ChannelId }) => {
  const totalMessageCount = ref<number>()
  const isLoading = ref(false)
  const isFailed = ref(false)
  let fetchId = 0

  const fetch = async () => {
    const currentFetchId = ++fetchId
    isLoading.value = true
    isFailed.value = false

    try {
      const { data } = await fetchChannelStats(props.channelId, true)
      if (currentFetchId !== fetchId) return

      totalMessageCount.value = data.totalMessageCount
    } catch (e) {
      if (currentFetchId !== fetchId) return

      // eslint-disable-next-line no-console
      console.error(e)
      totalMessageCount.value = undefined
      isFailed.value = true
    } finally {
      if (currentFetchId === fetchId) {
        isLoading.value = false
      }
    }
  }

  watch(
    () => props.channelId,
    () => {
      fetch()
    },
    { immediate: true }
  )

  useMittListener(messageMitt, 'addMessage', ({ message }) => {
    if (message.channelId !== props.channelId) return

    if (totalMessageCount.value === undefined) {
      fetch()
      return
    }

    totalMessageCount.value++
  })
  useMittListener(messageMitt, 'deleteMessage', ({ channelId }) => {
    if (channelId !== props.channelId) return

    if (totalMessageCount.value === undefined) {
      fetch()
      return
    }

    totalMessageCount.value = Math.max(0, totalMessageCount.value - 1)
  })
  useMittListener(messageMitt, 'reconnect', fetch)

  return {
    totalMessageCount,
    isLoading,
    isFailed,
    fetch
  }
}

export default useChannelMessageCount
