<script setup>
import {
  NSpace,
  NInput,
  NButton,
} from 'naive-ui'
import { ref } from 'vue'
import { getRandomPublicationNumber } from './business/examples.js'
import { useSelectionController } from './controllers/selectionController.js'

const selectionController = useSelectionController()

const noticeNumber = ref('')

function searchByNoticeNumber () {
  if (noticeNumber.value.trim()) {
    selectionController.searchFacet({
      type: 'notice-number',
      value: noticeNumber.value.trim(),
    })
  }
}

function handleSelectRandom () {
  noticeNumber.value = getRandomPublicationNumber()
  searchByNoticeNumber()
}

</script>

<template>
  <n-space align="center">
    <n-input
        v-model:value="noticeNumber"
        placeholder="Enter notice number"
        @keyup.enter="searchByNoticeNumber"
    >
    </n-input>
    <n-button secondary @click="searchByNoticeNumber"> Search</n-button>
    <n-button @click="handleSelectRandom" secondary size="tiny">
      Random
    </n-button>
  </n-space>
</template>

<style>

</style>
