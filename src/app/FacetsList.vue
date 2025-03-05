<script setup>
import {
  NSpace,
  NTag,
} from 'naive-ui'
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'
import { getLabel } from '../facets/facets.js'

import { useSelectionController } from './controllers/selectionController.js'

const selectionController = useSelectionController()
const { facetsList, currentFacetIndex, results } =
    storeToRefs(selectionController)

function getClass (index) {
  return currentFacetIndex.value === index ? 'info' : 'default'
}

onMounted(() => {
  if (facetsList.value.length > 0) {
    selectionController.selectFacet(0)
  }
})


</script>

<template>
  <n-space style="margin: 10px 0">
    <n-tag
        v-for="(facet, index) in facetsList"
        :key="index"
        class="history-item"
        :type="getClass(index)"
        closable
        :trigger-click-on-close="false"
        @click="selectionController.selectFacet(index)"
        @close="selectionController.removeFacet(index)"
    >

      {{ getLabel(facet) }}
      <template v-if="index===currentFacetIndex">
        ({{ results?.stats?.triples }} triples)
      </template>


    </n-tag>
  </n-space>

</template>

<style>

.history-item {
  cursor: pointer;
  transition: transform 0.2s ease;
}

</style>
