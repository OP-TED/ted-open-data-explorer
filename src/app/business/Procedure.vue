<script setup>
import { computed } from 'vue'
import { mapResponse } from './noticeDetails.js'
import { useFetch } from '@vueuse/core'
import { NCard, NTimeline, NTimelineItem } from 'naive-ui'

const props = defineProps({
  procedureTedLinks: String,
})

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

function select (publicationNumber) {
  console.log(publicationNumber)
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
              @click="select(notice.publicationNumber)"
          />
        </template>
      </n-timeline>
    </div>

    <!--        <n-card size="small" :title="notice.publicationNumber">-->
    <!--          <p><a :href="notice.html" target="_blank">HTML</a>|<a :href="notice.pdf" target="_blank">PDF</a>|<a-->
    <!--              :href="notice.xml" target="_blank">XML</a></p>-->
    <!--          <p>Publication Date: {{ notice.publicationDate }}</p>-->
    <!--        </n-card>-->

  </div>
  <div v-else>No data available</div>
</template>
