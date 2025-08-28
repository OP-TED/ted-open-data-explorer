<script setup>
import { computed } from 'vue'
import { NTimeline, NTimelineItem } from 'naive-ui'
import { useSelectionController } from '../controllers/selectionController.js'
import { createPublicationNumberFacet } from '../../facets/noticeQueries.js'

const props = defineProps({
  procedureId: String,
  publicationNumbers: Array,
  notices: Array, // Pre-fetched notices data
  error: String, // Error from parent component
})

const selectionController = useSelectionController()

const notices = computed(() => {
  return props.notices || []
})

function handleClick (publicationNumber) {
  const facet = createPublicationNumberFacet(publicationNumber)
  if (facet) selectionController.selectFacet(facet)
}

const isContained = (publicationNumber) => props.publicationNumbers?.includes(publicationNumber)
const getType = (notice) => notice.noticeVersion ? 'warning' : 'success'
</script>

<template>
  <div v-if="error" class="error-message">{{ error }}</div>
  <div v-else-if="notices.length" class="procedure-container">
    <div v-if="procedureId" class="procedure-id">
      Procedure: {{ procedureId }}
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
.procedure-container {
  padding: 16px;
  margin-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.procedure-id {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 12px;
  font-size: 0.95em;
}

.timeline {
  flex: 1;
}

.timeline-item {
  cursor: pointer;
}

.error-message {
  color: #d32f2f;
  background: #ffebee;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 8px;
}
</style>
