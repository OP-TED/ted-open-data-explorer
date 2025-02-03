<script setup>
import { lightTheme, NConfigProvider, NSpace, NTag } from 'naive-ui'
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { getRandomPublicationNumber } from './business/examples.js'
import Procedure from './business/Procedure.vue'
import EntityList from './components/EntityList.vue'
import SparqlEditor from './Editor.vue'
import { useSelectionController } from './controllers/selectionController.js'

const selectionController = useSelectionController()
const { query, history, selectedHistoryIndex, error, isLoading, results } = storeToRefs(selectionController)

onMounted(() => {

  if (history.value.length === 0) {
    selectionController.selectNoticeByPublicationNumber(getRandomPublicationNumber())
  } else {
    selectionController.selectHistoryItem(0)
  }

})

function getHistoryItemType (index) {
  return selectedHistoryIndex.value === index ? 'info' : 'default'
}

</script>

<template>
  <n-config-provider :theme="lightTheme">
    <n-space vertical>
      <div style="display: flex; flex-direction: column; align-items: flex-end;">
        <sparql-editor v-model="query" :isLoading="isLoading"></sparql-editor>
      </div>

      <n-space v-if="history.length" style="margin: 10px 0;">
        <n-tag
            v-for="(item, index) in history"
            :key="index"
            class="history-item"
            :type="getHistoryItemType(index)"
            closable
            :trigger-click-on-close="false"
            @click="selectionController.selectHistoryItem(index)"
            @close="selectionController.removeHistoryItem(index)"
        >
          {{ item.label }}
        </n-tag>
      </n-space>

      <div v-if="error">{{ error.message }}</div>
      <template v-if="results?.extracted" v-for="procedureId of results.extracted.procedureIds">
        <Procedure :procedureId="procedureId" :publicationNumbers="results.extracted.publicationNumbers"/>
      </template>
      <template v-if="results?.stats">
        {{ results?.stats }}
      </template>

      <div v-if="results?.entities" class="entity-container">
        <EntityList :entities="results?.entities"/>
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
