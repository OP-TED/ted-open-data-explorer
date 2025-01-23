<script setup>
import { computed } from 'vue'
import { mapResponse } from './noticeDetails.js'
import { useFetch } from '@vueuse/core'
import { NCard } from 'naive-ui'

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

</script>

<template>
  <div>
    <p v-if="isFetching">Fetching data...</p>
    <p v-else-if="error">Error: {{ error }}</p>
    <p v-else-if="data">
      <p>Procedure ID: {{ details.procedureId }}</p>
      <template v-for="notice of details.notices">
        <n-card size="small" :title="notice.publicationNumber">
          <p><a :href="notice.html" target="_blank">HTML</a>|<a :href="notice.pdf" target="_blank">PDF</a>|<a
              :href="notice.xml" target="_blank">XML</a></p>
          <p>Publication Date: {{ notice.publicationDate }}</p>
        </n-card>
      </template>

    </p>
    <p v-else>No data available</p>
  </div>
</template>
