<script setup>
import {
  NSpace,
  NInput,
  NButton,
  NIcon,
  useMessage,
} from 'naive-ui'
import { ref } from 'vue'
import { ShareSocialOutline as ShareIcon } from '@vicons/ionicons5';
import { storeToRefs } from 'pinia'
import { createPublicationNumberFacet } from '../facets/noticeQueries.js'
import { getRandomPublicationNumber } from '../services/randomNoticeService.js'
import { useSelectionController } from './controllers/selectionController.js'

const selectionController = useSelectionController()
const message = useMessage()
const { currentFacet } = storeToRefs(selectionController)

const noticeNumber = ref('')

function searchByNoticeNumber() {
  const facet = createPublicationNumberFacet(noticeNumber.value)
  if (facet) selectionController.selectFacet(facet)
}

async function handleSelectRandom() {
  noticeNumber.value = await getRandomPublicationNumber()
  searchByNoticeNumber()
}

async function handleShare() {
  const url = selectionController.getShareableUrl()
  if (url) {
    try {
      await navigator.clipboard.writeText(url)
      message.success('URL copied to clipboard')
    } catch {
      message.error('Failed to copy URL')
    }
  }
}
</script>

<template>
  <n-space justify="space-between" align="center" class="bar">
    <n-space>
    <n-input
        v-model:value="noticeNumber"
        placeholder="Enter notice number"
        @keyup.enter="searchByNoticeNumber"
    />

      <n-button secondary @click="searchByNoticeNumber">Search</n-button>
      <n-button secondary size="tiny" @click="handleSelectRandom">Random</n-button>
    </n-space>
    <n-button
        v-if="currentFacet"
        size="small"
        type="primary"
        @click="handleShare"
    >
      <n-icon><ShareIcon /></n-icon>
    </n-button>
  </n-space>
</template>

<style scoped>
.bar {
  width: 100%;
}
</style>
