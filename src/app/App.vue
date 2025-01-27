<script setup>
import { lightTheme, NButton, NConfigProvider, NSpace } from 'naive-ui'
import { computed, onMounted, ref, watchEffect } from 'vue'
import { getEntities } from '../traversers/entities.js'
import { getProcedureTedLinks } from './business/noticeDetails.js'
import Procedure from './business/Procedure.vue'
import EntityList from './components/EntityList.vue'
import { ns } from '../namespaces.js'
import SparqlEditor from './Editor.vue'
import { useSelectionController } from './controllers/selectionController.js'
import { storeToRefs } from 'pinia'
import { executeQuery } from '../services/doQuery.js'

const selectionController = useSelectionController()
const { query } = storeToRefs(selectionController)

const dataset = ref(null)
const error = ref(null)
const isLoading = ref(false)

const procedureTedLinks = computed(() => {
  if (!dataset.value) return []
  const [tedLink] = getProcedureTedLinks({ dataset: dataset.value })
  return tedLink
})

const entities = computed(() => {
  if (!dataset.value) return []
  return getEntities(dataset.value, {
    ignoreNamedGraphs: true,
    matchers: [
      { predicate: ns.rdf.type, object: ns.epo.Notice },
      {},
    ],
  })
})

async function doExecuteQuery () {
  try {
    isLoading.value = true
    error.value = null
    dataset.value = await executeQuery(query.value)
  } catch (e) {
    error.value = e
    dataset.value = null
  } finally {
    isLoading.value = false
  }
}

// Add watchEffect to automatically execute query when it changes
watchEffect(() => {
  if (query.value) {
    doExecuteQuery()
  }
})

onMounted(() => {
  selectionController.selectNoticeByPublicationNumber('665930-2024')

})
</script>

<template>
  <n-config-provider :theme="lightTheme">
    <n-space vertical>
      <div style="display: flex; flex-direction: column; align-items: flex-end;">
        <sparql-editor v-model="query" style="width: 100%;"></sparql-editor>
        <n-button @click="doExecuteQuery" :loading="isLoading" style="margin-top: 8px;">Execute Query</n-button>
      </div>
      <div v-if="error">{{ error.message }}</div>
      <div v-else-if="dataset" class="entity-container">
        <Procedure :procedureTedLinks="procedureTedLinks"/>
        <EntityList :entities="entities"/>
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
