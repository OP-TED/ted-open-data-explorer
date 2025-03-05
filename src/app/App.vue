<script setup>
import {
  lightTheme,
  NConfigProvider,
  NSpace,
  NCollapseItem,
  NCollapse, NButton,
} from 'naive-ui'
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { getQuery } from '../facets/facets.js'
import Procedure from './business/Procedure.vue'
import EntityList from './components/EntityList.vue'
import FacetsList from './FacetsList.vue'
import Search from './Search.vue'

import SparqlEditor from './Editor.vue'
import { useSelectionController } from './controllers/selectionController.js'

const selectionController = useSelectionController()
const { currentFacet, error, isLoading, results } = storeToRefs(selectionController)

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

</script>

<template>
  <n-config-provider :theme="lightTheme">
    <n-space vertical>

      <!-- Search section -->
      <Search/>

      <!-- Query editor in collapse -->
      <n-collapse>
        <n-collapse-item title="SPARQL Query" name="query">
          <div
              style="display: flex;
                            flex-direction: column;
                            align-items: flex-end;
                        "
          >
            <sparql-editor
                v-model="editorQuery"
                :isLoading="isLoading"
            ></sparql-editor>
            <n-button @click="doSparql(editorQuery)" :loading="isLoading" class="editor-button">
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
      <!--      <n-space align="center">-->
      <!--        <n-button-->
      <!--            v-if="selectedHistoryIndex > 0"-->
      <!--            @click="selectionController.selectHistoryItem(selectedHistoryIndex - 1)"-->
      <!--            secondary-->
      <!--            size="large"-->
      <!--        >Go Back-->
      <!--        </n-button>-->
      <!--      </n-space>-->

      <div v-if="results?.entities" class="entity-container">
        <EntityList :entities="results?.entities"/>
      </div>
      <div v-if="isLoading">Loading...</div>
    </n-space>
  </n-config-provider>
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
