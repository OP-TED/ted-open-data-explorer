<script setup>
import {
  lightTheme,
  NConfigProvider,
  NSpace,
  NTag,
  NInput,
  NButton,
  NCollapseItem,
  NCollapse,
} from 'naive-ui'
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { getRandomPublicationNumber } from './business/examples.js'
import Procedure from './business/Procedure.vue'
import EntityList from './components/EntityList.vue'
import SparqlEditor from './Editor.vue'
import { useSelectionController } from './controllers/selectionController.js'

const selectionController = useSelectionController()
const { query, history, selectedHistoryIndex, error, isLoading, results } =
    storeToRefs(selectionController)
const noticeNumber = ref('')

onMounted(() => {
  if (history.value.length > 0) {
    selectionController.selectHistoryItem(0)
  }
})

function getHistoryItemType (index) {
  return selectedHistoryIndex.value === index ? 'info' : 'default'
}

function handleSearch () {
  if (noticeNumber.value.trim()) {
    selectionController.selectNoticeByPublicationNumber(
        noticeNumber.value.trim(),
    )
  }
}

function handleRandom () {
  noticeNumber.value = getRandomPublicationNumber()
  selectionController.selectNoticeByPublicationNumber(noticeNumber.value)
}
</script>

<template>
  <n-config-provider :theme="lightTheme">
    <n-space vertical>
      <!-- Search section -->
      <n-space align="center">
        <n-input
            v-model:value="noticeNumber"
            placeholder="Enter notice number"
            @keyup.enter="handleSearch"
        >
        </n-input>
        <n-button secondary @click="handleSearch"> Search</n-button>
        <n-button @click="handleRandom" secondary size="tiny">
          Random
        </n-button>
      </n-space>

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
                v-model="query"
                :isLoading="isLoading"
            ></sparql-editor>
          </div>
        </n-collapse-item>
      </n-collapse>

      <n-space v-if="history.length" style="margin: 10px 0">
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
          <template v-if="index===selectedHistoryIndex">
            {{ item.label }} ({{ results?.stats?.triples }} triples)
          </template>
          <template v-else>
            {{ item.label }}
          </template>

        </n-tag>
      </n-space>

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
      <n-space align="center">
        <n-button
            v-if="selectedHistoryIndex > 0"
            @click="selectionController.selectHistoryItem(selectedHistoryIndex - 1)"
            secondary
            size="large"
        >
          Go Back
        </n-button>

      </n-space>

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

/* Additional styles */
.n-collapse-item :deep(.n-collapse-item__header) {
  background-color: #f5f5f5;
}
</style>
