<script setup>
import { lightTheme, NConfigProvider, NSpace, NTag, useMessage } from 'naive-ui'
import { computed, onMounted, ref, watchEffect } from 'vue'
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
const { query, history } = storeToRefs(selectionController)

const error = ref(null)
const isLoading = ref(false)
const entities = ref(false)
const extracted = ref(false)

async function doExecuteQuery() {
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

function handleQueryClick(queryStr) {
  query.value = queryStr
}

function handleQueryClose(index) {
  selectionController.removeHistoryItem(index)
}

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
        <sparql-editor v-model="query" :isLoading="isLoading"></sparql-editor>
      </div>

      <!-- History Tags -->
      <n-space v-if="history.length" style="margin: 10px 0;">
        <n-tag
          v-for="(item, index) in history"
          :key="index"
          class="history-item"
          type="info"
          closable
          :trigger-click-on-close="false"
          @click="handleQueryClick(item.queryStr)"
          @close="handleQueryClose(index)"
        >
          {{ item.label }}
        </n-tag>
      </n-space>

      <div v-if="error">{{ error.message }}</div>
      <template v-if="extracted" v-for="procedureId of extracted.procedureIds">
        <Procedure :procedureId="procedureId"
                  :publicationNumbers="extracted.publicationNumbers"/>
      </template>
      <div v-if="entities" class="entity-container">
        <EntityList :entities="entities"/>
      </div>
      <div v-if="isLoading">Loading...</div>
    </n-space>
  </n-config-provider>
</template>

<style>
.entity-container {
  background-color: white;
}
 .history-item {
   cursor: pointer;
   transition: transform 0.2s ease;
 }

.history-item:hover {
  transform: translateY(-2px);
}


</style>
