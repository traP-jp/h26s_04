<template>
  <!-- Modal layout -->
  <div v-if="disableFold" :class="$style.containerModal">
    <span
      :class="$style.date"
      :title="message.createdAt !== message.updatedAt ? createdDate : undefined"
      >{{ date }}</span
    >
    <div :class="$style.header">
      <UserIcon :class="$style.userIcon" :user-id="message.userId" :size="40" />
      <MessageHeader :class="$style.messageHeader" :user-id="message.userId" />
    </div>
    <div :class="$style.messageContentsModal">
      <MarkdownContent
        v-show="!isEditing"
        :content="renderedContent"
        :class="$style.markdownContent"
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

  <!-- Non-modal layout (original grid) -->
  <div v-else :class="$style.container">
    <UserIcon :class="$style.userIconGrid" :user-id="message.userId" :size="40" />
    <MessageHeader
      :class="$style.messageHeaderGrid"
      :user-id="message.userId"
      :created-at="message.createdAt"
      :updated-at="message.updatedAt"
    />
    <div :class="$style.messageContents">
      <MarkdownContent v-show="!isEditing" :content="renderedContent" />
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
/* Non-modal: original grid layout */
.container {
  display: grid;
  grid-template:
    'user-icon message-header'
    'user-icon message-contents'
    '......... message-contents';
  grid-template-rows: 20px auto 1fr;
  grid-template-columns: 42px 1fr;
  width: 100%;
  min-width: 0;
}

.userIconGrid {
  grid-area: user-icon;
  margin-top: 2px;
}

.messageHeaderGrid {
  grid-area: message-header;
  padding-left: 8px;
}

.messageContents {
  grid-area: message-contents;
  padding-top: 4px;
  padding-left: 8px;
  min-width: 0;
}

/* Modal: flex column layout */
.containerModal {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
}

.date {
  @include color-ui-secondary;
  @include size-caption;
  margin: 0 0 24px 0;
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

.messageContentsModal {
  padding-top: 4px;
  min-width: 0;
}

.markdownContent {
  margin: 32px 0;
}

.messageEmbeddingsList {
  margin-top: 16px;
}
</style>
