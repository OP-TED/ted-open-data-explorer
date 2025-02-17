<script setup>
import { computed } from 'vue'
import { mapResponse, procedureAPIUrl, apiURL } from './tedAPI.js'
import { useFetch } from '@vueuse/core'
import { NTimeline, NTimelineItem } from 'naive-ui'
import { useSelectionController } from '../controllers/selectionController.js'

const props = defineProps({
  procedureId: String,
  publicationNumbers: Array,
})

const procedureUrl = computed(() => procedureAPIUrl(props.procedureId))
const procedureClickableUrl = computed(() => apiURL(props.procedureId))

const controller = useSelectionController()

const { isFetching, error, data } = useFetch(procedureUrl.value)

const notices = computed(() => {
  if (!data.value) return []
  const parsedData = JSON.parse(data.value)
  return mapResponse(parsedData)
})

function select (publicationNumber) {
  controller.selectFacet({
    type: 'notice-number',
    value: publicationNumber,
  })
}

// Publication numbers sometimes have zeroes, sometimes they don't
const normalize = (number) =>
    number.startsWith('00') ? number : `00${number}`

function contained (publicationNumber) {
  const numbers = new Set(props.publicationNumbers.map(normalize))
  return numbers.has(normalize(publicationNumber))
}

function timelineItemType (notice) {
  return notice.changeNoticeVersionIdentifier ? 'warning' : 'success'
}

function timelineLineType (notice) {
  return notice.nextVersion ? 'dashed' : 'default'
}
</script>

<template>
  <div v-if="isFetching">Fetching data...</div>
  <div v-else-if="error">Error: {{ error }}</div>
  <div class="timeline" v-else-if="data">
    <div v-if="procedureId">
      <div> Procedure ID:</div>

      <a :href="procedureClickableUrl">{{ procedureId }}</a>
    </div>
    <div>
      <n-timeline horizontal>
        <template v-for="notice of notices">
          <n-timeline-item
              :type="timelineItemType(notice)"
              :title="notice.publicationNumber"
              :content="`${notice.noticeType.value} - ${notice.formType.value}`"
              :time="notice.publicationDate"
              :line-type="timelineLineType(notice)"
              class="timeline-item"
              @click="select(notice.publicationNumber)"
          >
            <template #header>
              <h3 v-if="contained(notice.publicationNumber)">
                {{ notice.publicationNumber }}
              </h3>
            </template>
            <template #footer>
              <a :href="notice.html" target="_blank" rel="noopener noreferrer">html</a>
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
