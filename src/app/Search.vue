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

function normalizePublicationNumber (publicationNumber) {
  const [number, year] = publicationNumber.split('-')
  const paddedNumber = number.padStart(8, '0')
  return `${paddedNumber}-${year}`
}

function searchByNoticeNumber () {
  if (noticeNumber.value.trim()) {
    selectionController.selectFacet({
      type: 'notice-number',
      value: normalizePublicationNumber(noticeNumber.value),
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
