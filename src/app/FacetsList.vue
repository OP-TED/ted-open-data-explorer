<script setup>
import { NSpace } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'
import { useSelectionController } from './controllers/selectionController.js'
import Facet from './Facet.vue'

const props = defineProps({
  facets: {
    type: Array,
    required: true
  },
  direction: {
    type: String,
    default: 'horizontal'
  }
})

const selectionController = useSelectionController()
const { currentFacet, results } = storeToRefs(selectionController)

function handleSelect(facet) {
  selectionController.selectFacetByReference(facet)
}

function handleRemove(facet) {
  const index = selectionController.facetsList.indexOf(facet)
  if (index !== -1) {
    selectionController.removeFacet(index)
  }
}

onMounted(() => {
  if (selectionController.facetsList.length > 0) {
    selectionController.selectFacet(0)
  }
  selectionController.initFromUrlParams()
})
</script>

<template>
  <n-space 
    :vertical="direction === 'vertical'" 
    :size="direction === 'vertical' ? 'small' : 'medium'"
    :style="direction === 'horizontal' ? 'margin: 10px 0' : ''"
    v-if="facets.length > 0"
  >
    <Facet
        v-for="facet in facets"
        :key="facet.timestamp || facet.term?.value || facet.value"
        :facet="facet"
        :is-selected="currentFacet === facet"
        :total-triples="currentFacet === facet ? results?.stats?.triples : undefined"
        @select="() => handleSelect(facet)"
        @remove="() => handleRemove(facet)"
    />
  </n-space>
</template>
