<script setup>
import { NSpace } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'
import { useSelectionController } from './controllers/selectionController.js'
import Facet from './Facet.vue'

const selectionController = useSelectionController()
const { facetsList, currentFacetIndex, results } =
    storeToRefs(selectionController)

onMounted(() => {
  if (facetsList.value.length > 0) {
    selectionController.selectFacet(0)
  }
  selectionController.initFromUrlParams()
})
</script>

<template>
  <n-space style="margin: 10px 0">
    <Facet
        v-for="(facet, index) in facetsList"
        :key="index"
        :facet="facet"
        :index="index"
        :is-selected="currentFacetIndex === index"
        :total-triples="index === currentFacetIndex ? results?.stats?.triples : undefined"
        @select="selectionController.selectFacet"
        @remove="selectionController.removeFacet"
    />
  </n-space>
</template>
