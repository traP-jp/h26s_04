<template>
  <div :class="$style.container">
    <span
      :class="$style.date"
      :title="message.createdAt !== message.updatedAt ? createdDate : undefined"
      :data-is-modal="$boolAttr(disableFold)"
      >{{ date }}</span
    >
    <div :class="$style.header">
      <UserIcon :class="$style.userIcon" :user-id="message.userId" :size="40" />
      <MessageHeader :class="$style.messageHeader" :user-id="message.userId" />
    </div>
    <div :class="$style.messageContents">
      <MarkdownContent
        v-show="!isEditing"
        :content="renderedContent"
        :class="$style.markdownContent"
        :data-is-modal="$boolAttr(disableFold)"
      />
      <MessageEditor
        v-if="isEditing"
        :raw-content="message.content"
        :message-id="messageId"
        :channel-id="message.channelId"
        @finish-editing="finishEditing"
      />
      <MessageQuoteList
        v-if="embeddingsState.quoteMessageIds.length > 0"
        :class="$style.messageEmbeddingsList"
        :parent-message-channel-id="message.channelId"
        :message-ids="embeddingsState.quoteMessageIds"
      />
      <MessageFileList
        v-if="embeddingsState.fileIds.length > 0"
        :class="$style.messageEmbeddingsList"
        :channel-id="message.channelId"
        :file-ids="embeddingsState.fileIds"
      />
      <MessageOgpList
        v-if="embeddingsState.externalUrls.length > 0"
        :external-urls="embeddingsState.externalUrls"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

import MarkdownContent from '/@/components/UI/MarkdownContent.vue'
import UserIcon from '/@/components/UI/UserIcon.vue'
import useEmbeddings from '/@/composables/message/useEmbeddings'
import {
  getDateRepresentation,
  getFullDayWithTimeString
} from '/@/lib/basic/date'
import { useMessagesView } from '/@/store/domain/messagesView'
import { useMessagesStore } from '/@/store/entities/messages'
import { useMessageEditingStateStore } from '/@/store/ui/messageEditingStateStore'
import type { MessageId } from '/@/types/entity-ids'

import MessageFileList from './Embeddings/MessageFileList.vue'
import MessageOgpList from './Embeddings/MessageOgpList.vue'
import MessageQuoteList from './Embeddings/MessageQuoteList.vue'
import MessageEditor from './MessageEditor.vue'
import MessageHeader from './MessageHeader.vue'

const props = defineProps<{
  messageId: MessageId
  disableFold?: boolean
}>()

const { getMessageRef } = useMessagesStore()
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const message = computed(() => getMessageRef(props.messageId).value!)

const { editingMessageId } = useMessageEditingStateStore()
const isEditing = computed(() => props.messageId === editingMessageId.value)
const finishEditing = () => {
  editingMessageId.value = undefined
}

const { renderedContentMap } = useMessagesView()
const renderedContent = computed(
  () => renderedContentMap.value.get(props.messageId) ?? ''
)

const { embeddingsState } = useEmbeddings(props)

const createdDate = computed(() =>
  getFullDayWithTimeString(new Date(message.value.createdAt))
)
const date = computed(() => getDateRepresentation(message.value.updatedAt))
</script>

<style lang="scss" module>
.container {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
}

.date {
  @include color-ui-secondary;
  @include size-caption;
  margin: 0 0 4px 0;
  &[data-is-modal] {
    margin: 0 0 24px 0;
  }
}

.header {
  display: flex;
  align-items: center;
}

.userIcon {
  flex-shrink: 0;
}

.messageHeader {
  padding-left: 8px;
  min-width: 0;
}

.messageContents {
  padding-top: 4px;
  min-width: 0;
}

.messageEmbeddingsList {
  margin-top: 16px;
}
.markdownContent {
  &[data-is-modal] {
    margin: 32px 0 32px 0;
  }
  margin: 16px 0 16px 0;
}
</style>
