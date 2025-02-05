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

function handleSearchByNoticeNumber () {
  if (noticeNumber.value.trim()) {
    selectionController.selectNoticeByPublicationNumber(
        noticeNumber.value.trim(),
    )
  }
}

function handleSelectRandom () {
  noticeNumber.value = getRandomPublicationNumber()
  selectionController.selectNoticeByPublicationNumber(noticeNumber.value)
}

</script>

<template>
  <n-space align="center">
    <n-input
        v-model:value="noticeNumber"
        placeholder="Enter notice number"
        @keyup.enter="handleSearchByNoticeNumber"
    >
    </n-input>
    <n-button secondary @click="handleSearchByNoticeNumber"> Search</n-button>
    <n-button @click="handleSelectRandom" secondary size="tiny">
      Random
    </n-button>
  </n-space>
</template>

<style>

</style>
