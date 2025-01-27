<script setup>
import grapoi from 'grapoi'
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

const error = ref(null)
const isLoading = ref(false)

const entities = ref(false)
const procedureInfo = ref()

async function doExecuteQuery () {
  try {
    isLoading.value = true
    error.value = null
    entities.value = false
    procedureInfo.value  = undefined
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
    const [tedLink] = getProcedureTedLinks({ dataset })
    const publicationNumbers = guessPublicationNumbers({dataset})

    procedureInfo.value = {
      tedLink,
      publicationNumbers
    }
  } catch (e) {
    error.value = e
  } finally {
    isLoading.value = false
  }
}

function guessPublicationNumbers ({ dataset }) {
  const pointer = grapoi({ dataset })
  return pointer.out(ns.epo.hasNoticePublicationNumber).values
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
      <Procedure v-if="procedureInfo" :procedureInfo="procedureInfo"/>
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
