<script setup>
import {
  NSpace,
  NCollapseItem,
  NCollapse,
  NButton,
} from 'naive-ui'
import { onMounted, ref, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { getQuery } from '../facets/facets.js'
import Procedure from './business/Procedure.vue'
import Term from './components/Term.vue'
import { RdfTree } from 'rdf-tree'
import 'rdf-tree/dist/rdf-tree.css'
import grapoi from 'grapoi'
import rdf from 'rdf-ext'

import FacetsList from './FacetsList.vue'
import TopBar from './TopBar.vue'

import SparqlEditor from './Editor.vue'
import { useSelectionController, defaultOptions } from './controllers/selectionController.js'

const selectionController = useSelectionController()
const { currentFacet, error, isLoading, results } =
    storeToRefs(selectionController)

function doSparql (query) {
  selectionController.selectFacet({
    type: 'query',
    query,
  })
}

const editorQuery = ref('')
watch(currentFacet, async (newFacet, oldFacet) => {
  editorQuery.value = getQuery(newFacet)
})

// Create a pointer for the RdfTree component from the dataset
const rdfPointer = computed(() => {
  if (!results.value?.dataset) return null

  // Create a grapoi pointer from the dataset - RdfTree will handle entity processing
  const dataset = results.value.dataset
  return grapoi({ dataset, factory: rdf })
})


</script>


<template>
  <n-space vertical>


    <!-- Search section -->
    <TopBar/>

    <!-- Query editor in collapse -->
    <n-collapse>
      <n-collapse-item title="SPARQL Query" name="query">
        <div
            style="
                                display: flex;
                                flex-direction: column;
                                align-items: flex-end;
                            "
        >
          <sparql-editor
              v-model="editorQuery"
              :isLoading="isLoading"
          ></sparql-editor>
          <n-button
              @click="doSparql(editorQuery)"
              :loading="isLoading"
              class="editor-button"
          >
            Execute Query
          </n-button>
        </div>
      </n-collapse-item>
    </n-collapse>

    <FacetsList/>

    <div v-if="error">{{ error.message }}</div>
    <template
        v-if="results?.extracted"
        v-for="procedureId of results.extracted.procedureIds"
    >
      <Procedure
          :procedureId="procedureId"
          :publicationNumbers="results.extracted.publicationNumbers"
      />
    </template>
    <div v-if="results?.dataset && rdfPointer" class="entity-container">
      <RdfTree
          :pointer="rdfPointer"
          :options="defaultOptions"
          :enableHighlighting="false"
          :enableRightClick="false"
          :termComponent="Term"
      />
    </div>
    <div v-if="isLoading">Loading...</div>
  </n-space>

</template>

<style>
.editor-button {
  margin-top: 8px;
}

.entity-container {
  background-color: white;
}

/* Additional styles */
.n-collapse-item :deep(.n-collapse-item__header) {
  background-color: #f5f5f5;
}
</style>
