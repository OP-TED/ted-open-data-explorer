<script setup>
import { computed } from 'vue'
import { mapResponse } from './noticeDetails.js'
import { useFetch } from '@vueuse/core'
import { NCard, NTimeline, NTimelineItem } from 'naive-ui'
import { useSelectionController } from '../controllers/selectionController.js'

const props = defineProps({
  procedureTedLinks: String,
})

const controller = useSelectionController()

const { isFetching, error, data } = useFetch(props.procedureTedLinks)

const details = computed(() => {
  if (!data.value) return []
  const parsedData = JSON.parse(data.value)
  const mapped = mapResponse(parsedData)
  return {
    procedureId: mapped[0].procedureId,
    notices: mapped,
  }
})

function select(publicationNumber) {
  controller.selectNoticeByPublicationNumber(publicationNumber)
}
</script>

<template>
  <div v-if="isFetching">Fetching data...</div>
  <div v-else-if="error">Error: {{ error }}</div>
  <div v-else-if="data">
    <div v-if="details.procedureId">Procedure ID: {{ details.procedureId }}</div>
    <div style="overflow: auto">
      <n-timeline horizontal>
        <template v-for="notice of details.notices">
          <n-timeline-item
              type="success"
              :title="notice.publicationNumber"
              :content="notice.noticeType.value"
              :time="notice.publicationDate"
              class="timeline-item"
              @click="select(notice.publicationNumber)"
          />
        </template>
      </n-timeline>
    </div>
  </div>
  <div v-else>No data available</div>
</template>

<style scoped>
.timeline-item {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.timeline-item:hover {
  transform: translateY(-2px);
}

:deep(.n-timeline-item-content) {
  cursor: pointer;
}

:deep(.n-timeline-item-content:hover) {
  color: #18a058;
}
</style>
