import type { ChannelStats } from '@traptitech/traq'

import { computed, ref, watch } from 'vue'

import useMittListener from '/@/composables/utils/useMittListener'
import apis from '/@/lib/apis'
import { type StampStatsDiff, messageMitt } from '/@/store/entities/messages'
import type { ChannelId } from '/@/types/entity-ids'

const useChannelStats = (props: { channelId: ChannelId }) => {
  const channelStats = ref<ChannelStats>()
  const isLoading = ref(false)
  const isFailed = ref(false)
  let fetchId = 0
  let shouldRefetchAfterLoading = false

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
        if (shouldRefetchAfterLoading) {
          shouldRefetchAfterLoading = false
          fetch()
        }
      }
    }
  }

  const requestFetch = () => {
    if (isLoading.value) {
      shouldRefetchAfterLoading = true
      return
    }

    fetch()
  }

  const updateTotalMessageCount = (getNextCount: (count: number) => number) => {
    if (channelStats.value === undefined) {
      requestFetch()
      return
    }

    channelStats.value = {
      ...channelStats.value,
      totalMessageCount: getNextCount(channelStats.value.totalMessageCount)
    }
  }

  const updateUserMessageCount = (
    userId: string,
    getNextCount: (count: number) => number
  ) => {
    if (channelStats.value === undefined) {
      requestFetch()
      return
    }

    const users = [...channelStats.value.users]
    const index = users.findIndex(user => user.id === userId)

    if (index === -1) {
      const messageCount = Math.max(0, getNextCount(0))
      if (messageCount > 0) {
        users.push({ id: userId, messageCount })
      }
    } else {
      const currentUser = users[index]
      if (currentUser === undefined) return

      const nextUser = {
        ...currentUser,
        messageCount: Math.max(0, getNextCount(currentUser.messageCount))
      }

      if (nextUser.messageCount === 0) {
        users.splice(index, 1)
      } else {
        users[index] = nextUser
      }
    }

    channelStats.value = {
      ...channelStats.value,
      users
    }
  }

  const updateStampStats = (diffs: readonly StampStatsDiff[]) => {
    if (channelStats.value === undefined) {
      requestFetch()
      return
    }

    const stamps = [...channelStats.value.stamps]

    for (const { stampId, countDelta, totalDelta } of diffs) {
      const index = stamps.findIndex(stamp => stamp.id === stampId)

      if (index === -1) {
        if (countDelta <= 0 && totalDelta <= 0) continue

        stamps.push({
          id: stampId,
          count: Math.max(0, countDelta),
          total: Math.max(0, totalDelta)
        })
        continue
      }

      const currentStamp = stamps[index]
      if (currentStamp === undefined) continue

      const nextStamp = {
        ...currentStamp,
        count: Math.max(0, currentStamp.count + countDelta),
        total: Math.max(0, currentStamp.total + totalDelta)
      }

      if (nextStamp.count === 0 && nextStamp.total === 0) {
        stamps.splice(index, 1)
      } else {
        stamps[index] = nextStamp
      }
    }

    channelStats.value = {
      ...channelStats.value,
      stamps
    }
  }

  watch(
    () => props.channelId,
    () => {
      shouldRefetchAfterLoading = false
      fetch({ clear: true })
    },
    { immediate: true }
  )

  useMittListener(messageMitt, 'addMessage', ({ message }) => {
    if (message.channelId !== props.channelId) return

    updateTotalMessageCount(count => count + 1)
    updateUserMessageCount(message.userId, count => count + 1)
  })
  useMittListener(messageMitt, 'deleteMessage', ({ channelId, userId }) => {
    if (channelId === undefined) {
      requestFetch()
      return
    }

    if (channelId !== props.channelId) return

    updateTotalMessageCount(count => Math.max(0, count - 1))
    if (userId === undefined) {
      requestFetch()
      return
    }
    updateUserMessageCount(userId, count => Math.max(0, count - 1))
  })
  useMittListener(
    messageMitt,
    'updateMessageStampStats',
    ({ channelId, diffs }) => {
      if (channelId !== props.channelId) return

      updateStampStats(diffs)
    }
  )
  useMittListener(messageMitt, 'reconnect', () => {
    requestFetch()
  })

  const totalMessageCount = computed(
    () => channelStats.value?.totalMessageCount
  )
  const stampStats = computed(() => channelStats.value?.stamps)
  const userStats = computed(() => channelStats.value?.users)

  return {
    totalMessageCount,
    stampStats,
    userStats,
    isLoading,
    isFailed
  }
}

export default useChannelStats
