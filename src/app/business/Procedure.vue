<script setup>
import { computed, ref } from 'vue'
import { createPublicationNumberFacet } from '../../facets/noticeQueries.js'
import { mapResponse, getRequest } from './tedAPI.js'
import { NTimeline, NTimelineItem } from 'naive-ui'
import { useSelectionController } from '../controllers/selectionController.js'

const props = defineProps({
  procedureId: String,
  publicationNumbers: Array,
})

const loading = ref(false)
const error = ref(null)
const responseData = ref(null)

// Fetch function that handles the new API format
async function fetchData () {
  if (!props.procedureId) return

  loading.value = true
  error.value = null

  try {
    const { url, options } = await getRequest(props.procedureId)
    const response = await fetch(url, options)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    responseData.value = await response.json()
  } catch (err) {
    error.value = err.message || 'Failed to fetch data'
    console.error('Error fetching procedure data:', err)
  } finally {
    loading.value = false
  }
}

// Trigger the fetch when procedureId changes
fetchData()

const selectionController = useSelectionController()

const notices = computed(() => {
  if (!responseData.value) return []
  return mapResponse(responseData.value)
})

function searchByNoticeNumber (publicationNumber) {
  const facet = createPublicationNumberFacet(publicationNumber)
  if (facet) {
    selectionController.selectFacet(facet)
  }
}

function contained (publicationNumber) {
  const numbers = new Set(props.publicationNumbers)
  return numbers.has(publicationNumber)
}

function timelineItemType (notice) {
  return notice.changeNoticeVersionIdentifier ? 'warning' : 'success'
}

function timelineLineType (notice) {
  return notice.nextVersion ? 'dashed' : 'default'
}
</script>

<template>
  <div v-if="loading">Fetching data...</div>
  <div v-else-if="error">Error: {{ error }}</div>
  <div class="timeline" v-else-if="responseData">
    <div v-if="procedureId">
      <div>Procedure ID:</div>
      <div>{{ procedureId }}</div>
    </div>
    <div>
      <n-timeline horizontal>
        <template v-for="notice of notices" :key="notice.publicationNumber">
          <n-timeline-item
              :type="timelineItemType(notice)"
              :title="notice.publicationNumber"
              :content="`${notice.noticeType.value} - ${notice.formType.value}`"
              :time="notice.publicationDate"
              :line-type="timelineLineType(notice)"
              class="timeline-item"
              @click="searchByNoticeNumber(notice.publicationNumber)"
          >
            <template #header>
              <h3 v-if="contained(notice.publicationNumber)">
                {{ notice.publicationNumber }}
              </h3>
            </template>
            <template #footer>
              <a v-if="notice.html" :href="notice.html" target="_blank" rel="noopener noreferrer">html</a>
            </template>
          </n-timeline-item>
        </template>
      </n-timeline>
    </div>
  </div>
  <div v-else>No data available</div>
</template>

<style scoped>
.timeline-item {
  cursor: pointer;
}

.timeline {
  display: flex;
  gap: 30px;
  padding-left: 30px;
}
</style>
