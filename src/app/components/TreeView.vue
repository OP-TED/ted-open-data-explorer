<script setup>
import { computed } from 'vue'
import { RdfTree } from 'rdf-tree'
import 'rdf-tree/dist/rdf-tree.css'
import grapoi from 'grapoi'
import rdf from 'rdf-ext'
import Term from './Term.vue'
import { defaultOptions } from '../controllers/selectionController.js'

const props = defineProps({
  dataset: Object,
  tooManyTriples: Boolean,
})

const rdfPointer = computed(() => {
  if (!props.dataset || props.tooManyTriples) return null
  return grapoi({ dataset: props.dataset, factory: rdf })
})
</script>

<template>
  <div class="rdf-tree-container">
    <RdfTree
        v-if="rdfPointer"
        :pointer="rdfPointer"
        :options="defaultOptions"
        :enableHighlighting="false"
        :enableRightClick="false"
        :termComponent="Term"
    />
    <div v-else class="no-pointer-message">
      Unable to create tree view for this dataset.
    </div>
  </div>
</template>

<style scoped>
.rdf-tree-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.no-pointer-message {
  text-align: center;
  color: #999;
  padding: 20px;
  font-style: italic;
}
</style>