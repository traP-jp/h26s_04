<template>
  <ClickOutside stop @click-outside="clearModal">
    <div :class="$style.container">
      <CommonModalHeader :class="$style.header" title="Message" />
      <div :class="$style.body">
        <MessageElement
          :class="$style.message"
          :message-id="messageId"
          :is-archived="isArchived"
          disable-fold
        />
      </div>
    </div>
  </ClickOutside>
</template>

<script lang="ts" setup>
import MessageElement from '/@/components/Main/MainView/MessageElement/MessageElement.vue'
import ClickOutside from '/@/components/UI/ClickOutside'
import { useModalStore } from '/@/store/ui/modal'
import type { MessageId } from '/@/types/entity-ids'

import CommonModalHeader from '../Common/ModalHeader.vue'

withDefaults(
  defineProps<{
    messageId: MessageId
    isArchived?: boolean
  }>(),
  {
    isArchived: false
  }
)

const { clearModal } = useModalStore()
</script>

<style lang="scss" module>
.container {
  @include background-primary;
  opacity: 0.9;
  display: flex;
  flex-direction: column;
  width: calc(50% - 32px);
  max-width: 30vw;
  max-height: calc(100% - 64px);
  border: {
    style: solid;
    width: 2px;
    color: $theme-background-secondary-border;
  }
  border-radius: 4px;
  overflow: hidden;
}

.header {
  flex-shrink: 0;
}

.body {
  width: 100%;
  padding: 16px 0;
  border-left: 1px solid white;
  overflow: {
    x: hidden;
    y: auto;
  }
  scrollbar-gutter: stable;
}

.message {
  margin: 6px 6px auto 6px;
}
</style>
