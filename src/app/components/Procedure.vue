<script setup>
import { computed, ref } from 'vue'
import { NTimeline, NTimelineItem } from 'naive-ui'
import { getRequest, mapResponse } from '../../services/tedAPI.js'
import { useSelectionController } from '../controllers/selectionController.js'
import { createPublicationNumberFacet } from '../../facets/noticeQueries.js'

const props = defineProps({
  procedureId: String,
  publicationNumbers: Array,
})

const loading = ref(false)
const error = ref(null)
const responseData = ref(null)

async function fetchData () {
  if (!props.procedureId) return

  loading.value = true
  error.value = null
  try {
    const { url, options } = await getRequest(props.procedureId)
    const response = await fetch(url, options)
    if (!response.ok) throw new Error(`API error: ${response.status}`)
    responseData.value = await response.json()
  } catch (err) {
    error.value = err.message || 'Failed to fetch data'
  } finally {
    loading.value = false
  }
}

fetchData()

const selectionController = useSelectionController()

const notices = computed(() => {
  if (!responseData.value) return []
  return mapResponse(responseData.value)
})

function handleClick (publicationNumber) {
  const facet = createPublicationNumberFacet(publicationNumber)
  if (facet) selectionController.selectFacet(facet)
}

const isContained = (publicationNumber) => props.publicationNumbers?.includes(publicationNumber)
const getType = (notice) => notice.noticeVersion ? 'warning' : 'success'
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="error">{{ error }}</div>
  <div v-else-if="notices.length" class="timeline-container">
    <div v-if="procedureId" class="procedure-id">
      <div>Procedure:</div>
      <div>{{ procedureId }}</div>
    </div>
    <n-timeline horizontal class="timeline">
      <n-timeline-item
          v-for="notice in notices"
          :key="notice.publicationNumber"
          :type="getType(notice)"
          :title="`${notice.publicationNumber}${notice.noticeVersion > 1 ? ` v${notice.noticeVersion}` : ''}`"
          :content="`${notice.noticeType} - ${notice.formType}`"
          :time="notice.publicationDate"
          class="timeline-item"
          @click="handleClick(notice.publicationNumber)"
      >
        <template #header>
          <h3 v-if="isContained(notice.publicationNumber)">
            {{ notice.publicationNumber }}
          </h3>
        </template>
        <template #footer>
          <a v-if="notice.html" :href="notice.html" target="_blank">HTML</a>
        </template>
      </n-timeline-item>
    </n-timeline>
  </div>
  <div v-else>No data available</div>
</template>

<style scoped>
.timeline-container {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 20px;
  padding: 20px;
  margin-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.procedure-id {
  flex-shrink: 0;
  white-space: nowrap;
}

.timeline {
  flex: 1;
}

.timeline-item {
  cursor: pointer;
}
</style>
