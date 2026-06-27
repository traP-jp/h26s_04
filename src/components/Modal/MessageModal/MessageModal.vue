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
  opacity: 0.85;
  display: inline-block;
  position: absolute;
  bottom: 0;
  left: 5vw;
  width: calc(50% - 32px);
  max-width: 30vw;
  //max-height: calc(100% - 64px);
  height: 60vh;
  border: {
    style: solid;
    width: 2px;
    color: $theme-background-secondary-border;
  }
  border-radius: 4px;
  overflow: hidden;
  border-left: 1px solid white;
  animation: modal-rise 0.45s cubic-bezier(0, 0, 0.2, 1) both;
}

@keyframes modal-rise {
  from {
    transform: translateY(100%);
  }
}

.header {
  flex-shrink: 0;
}

.body {
  width: 100%;
  overflow: {
    x: hidden;
    y: auto;
  }
  scrollbar-gutter: stable;
}

.message {
  margin: 6px 0 6px 6px;
}
</style>
