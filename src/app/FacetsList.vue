<script setup>
import { storeToRefs } from 'pinia'
import { onMounted, watchEffect, ref } from 'vue'
import { useSelectionController } from './controllers/selectionController.js'
import Facet from './Facet.vue'

const props = defineProps({
  facets: {
    type: Array,
    required: true
  }
})

const selectionController = useSelectionController()
const { currentFacet, results } = storeToRefs(selectionController)

// Create a local reactive copy of facets
const localFacets = ref([])

// Watch props.facets and update local copy
watchEffect(() => {
  localFacets.value = [...props.facets]

})

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
  <div v-if="localFacets.length > 0" class="facets-container">
    <div
      v-for="facet in localFacets"
      :key="facet.timestamp || facet.term?.value || facet.value"
      class="facet-wrapper"
    >
      <Facet
        :facet="facet"
        :is-selected="currentFacet === facet"
        :total-triples="currentFacet === facet ? results?.stats?.triples : undefined"
        @select="() => handleSelect(facet)"
        @remove="() => handleRemove(facet)"
      />
    </div>
  </div>
</template>

<style scoped>
.facets-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 0;
}

.facet-wrapper {
  /* Individual facet items will wrap when no space */
  flex-shrink: 0;
}
</style>
