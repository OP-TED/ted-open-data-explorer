<script setup>
import { lightTheme, NButton, NCard, NConfigProvider, NSpace, NCheckbox } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { getEntities } from '../traversers/entities.js'
import EntityList from './components/EntityList.vue'
import { ns } from '../namespaces.js'
import rdf from 'rdf-ext'
import { Parser } from 'n3'
import SparqlEditor from './Editor.vue'

// Define props for the SparqlEditor component
const query = ref('') // This will hold the current query string
const parseError = ref()
const entities = ref()

const focusOn = (type) => {
  return {
    ignoreNamedGraphs: true,
    matchers: [
      { // Priority for entities of type
        predicate: ns.rdf.type,
        object: type,
      },
      {}, // Everything else
    ],
  }
}


const executeQuery = async () => {
  try {
    const headers = new Headers({
      'Accept': 'text/turtle',
      'Content-Type': 'application/x-www-form-urlencoded'
    })

    const response = await fetch('/sparql', {
      method: 'POST',
      headers: headers,
      body: new URLSearchParams({ query: query.value }).toString()
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const responseData = await response.text()
    const parser = new Parser({ format: 'text/turtle' })
    const dataset = rdf.dataset([...parser.parse(responseData)])
    const options = focusOn(ns.epo.Notice)
    entities.value = getEntities(dataset, options)
    parseError.value = null

  } catch (error) {
    parseError.value = error.message
    entities.value = null
  }
}
onMounted(() => {
  // Initialize with some default query if needed
  query.value = `PREFIX epo: <http://data.europa.eu/a4g/ontology#>
PREFIX cccev: <http://data.europa.eu/m8g/>

CONSTRUCT {
  ?s ?p ?o
}
WHERE {
  graph <http://data.europa.eu/a4g/resource/2023/533553_2023> {
       ?s ?p ?o
  }
}`
})
</script>

<template>
  <n-config-provider :theme="lightTheme">
    <n-space vertical>
      <sparql-editor v-model="query"></sparql-editor>
      <n-button @click="executeQuery">Execute Query</n-button>
    </n-space>
    <div v-if="parseError">{{ parseError }}</div>
    <div class="entity-container" v-else>
      <EntityList :entities="entities"/>
    </div>
  </n-config-provider>
</template>

<style>
.entity-container {
  background-color: white;
}
</style>
