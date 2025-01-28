<script setup>
import { lightTheme, NConfigProvider, NSpace } from 'naive-ui'
import { onMounted, ref, watchEffect } from 'vue'
import { getEntities } from '../traversers/entities.js'
import { extractEntities } from './business/extractEntities.js'
import Procedure from './business/Procedure.vue'
import EntityList from './components/EntityList.vue'
import { ns } from '../namespaces.js'
import SparqlEditor from './Editor.vue'
import { useSelectionController } from './controllers/selectionController.js'
import { storeToRefs } from 'pinia'
import { executeQuery } from '../services/doQuery.js'

const selectionController = useSelectionController()
const { query } = storeToRefs(selectionController)

const error = ref(null)
const isLoading = ref(false)

const entities = ref(false)
const extracted = ref(false)

async function doExecuteQuery () {
  try {
    isLoading.value = true
    entities.value = false
    extracted.value = undefined
    error.value = null

    const dataset = await executeQuery(query.value)

    entities.value = getEntities(dataset, {
      ignoreNamedGraphs: true,
      matchers: [
        { predicate: ns.rdf.type, object: ns.epo.ChangeInformation },
        { predicate: ns.rdf.type, object: ns.epo.ResultNotice },
        { predicate: ns.rdf.type, object: ns.epo.Notice },
        {},
      ],
    })

    extracted.value = extractEntities({ dataset })

  } catch (e) {
    error.value = e
  } finally {
    isLoading.value = false
  }
}

// Add watchEffect to automatically doExecuteQuery() when query changes
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
        <sparql-editor v-model="query" :isLoading="isLoading" ></sparql-editor>
      </div>
      <template v-if="extracted" v-for="procedureId of extracted.procedureIds">
        <Procedure :procedureId="procedureId"
                   :publicationNumbers="extracted.publicationNumbers"/>
      </template>

      <div v-if="error">{{ error.message }}</div>
      <div v-else-if="entities" class="entity-container">
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
