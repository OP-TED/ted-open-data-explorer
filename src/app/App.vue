<script setup>
import { lightTheme, NButton, NConfigProvider, NSpace } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { useAsyncState } from '@vueuse/core'
import { getEntities } from '../traversers/entities.js'
import { getProcedureTedLinks } from './business/noticeDetails.js'
import Procedure from './business/Procedure.vue'
import EntityList from './components/EntityList.vue'
import { ns } from '../namespaces.js'
import rdf from 'rdf-ext'
import { Parser } from 'n3'
import SparqlEditor from './Editor.vue'
import { useSelectionController } from './controllers/selectionController.js'
import { storeToRefs } from 'pinia'

const selectionController = useSelectionController()
const { query } = storeToRefs(selectionController)

const procedureTedLinks = ref([])

const { state, execute, isReady, isLoading, error } = useAsyncState(
    () => {
      const headers = new Headers({
        'Accept': 'text/turtle',
        'Content-Type': 'application/x-www-form-urlencoded',
      })
      return fetch('/sparql', {
        method: 'POST',
        headers: headers,
        body: new URLSearchParams({ query: query.value }).toString(),
      }).then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(text)
          })
        }
        return response.text()
      }).then(responseData => {
        const parser = new Parser({ format: 'text/turtle' })
        const dataset = rdf.dataset([...parser.parse(responseData)])

        const [tedLink] = getProcedureTedLinks({ dataset })
        procedureTedLinks.value = tedLink

        return getEntities(dataset, {
          ignoreNamedGraphs: true,
          matchers: [
            { predicate: ns.rdf.type, object: ns.epo.Notice },
            {},
          ],
        })
      })
    },
    [],
    { immediate: false, errorMessage: 'Failed to fetch entities' },
)

const executeQuery = () => {
  execute()
}

onMounted(() => {
  selectionController.query = `PREFIX epo: <http://data.europa.eu/a4g/ontology#>
PREFIX cccev: <http://data.europa.eu/m8g/>

CONSTRUCT {
  ?s ?p ?o
}
WHERE {
  graph <http://data.europa.eu/a4g/resource/2024/00665930_2024> {
       ?s ?p ?o
  }
}`
})
</script>

<template>
  <n-config-provider :theme="lightTheme">
    <n-space vertical>
      <div style="display: flex; flex-direction: column; align-items: flex-end;">
        <sparql-editor v-model="query" style="width: 100%;"></sparql-editor>
        <n-button @click="executeQuery" :loading="isLoading" style="margin-top: 8px;">Execute Query</n-button>
      </div>
      <div v-if="error">{{ error.message }}</div>
      <div v-else-if="isReady" class="entity-container">
        <Procedure :procedureTedLinks="procedureTedLinks"/>
        <EntityList :entities="state"/>
      </div>
      <div v-else-if="isLoading">Loading...</div>
    </n-space>
  </n-config-provider>
</template>

<style>
.entity-container {
  background-color: white;
}
</style>
