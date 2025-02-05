<script setup>
import {
  NSpace,
  NTag,
} from 'naive-ui'
import { storeToRefs } from 'pinia'

import { useSelectionController } from './controllers/selectionController.js'

const selectionController = useSelectionController()
const { facetsList, selectedHistoryIndex, results } =
    storeToRefs(selectionController)

function getHistoryItemType (index) {
  return selectedHistoryIndex.value === index ? 'info' : 'default'
}

</script>

<template>
  <n-space style="margin: 10px 0">
    <n-tag
        v-for="(facet, index) in facetsList"
        :key="index"
        class="history-item"
        :type="getHistoryItemType(index)"
        closable
        :trigger-click-on-close="false"
        @click="selectionController.selectFacetByIndex(index)"
        @close="selectionController.removeFacetByIndex(index)"
    >
      <template v-if="index===selectedHistoryIndex">
        {{ facet.label }} ({{ results?.stats?.triples }} triples)
      </template>
      <template v-else>
        {{ facet.label }}
      </template>
    </n-tag>
  </n-space>

</template>

<style>

.history-item {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.history-item:hover {
  transform: translateY(-2px);
}

</style>
