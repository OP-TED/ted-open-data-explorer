<script setup>
import { computed, ref, watch } from 'vue'
import { NCard, NCollapse, NCollapseItem } from 'naive-ui'
import Procedure from './Procedure.vue'
import { getRequest, mapResponse } from '../../services/tedAPI.js'

const props = defineProps({
  publicationNumber: String,
  procedureIds: Array, // Array of procedure IDs associated with this notice
  allPublicationNumbers: Array, // All publication numbers for context
})

// State for managing procedure data for this notice
const proceduresData = ref([])
const loading = ref(false)
const error = ref(null)

// Fetch procedure data for all procedures associated with this notice
async function fetchProceduresData () {
  if (!props.procedureIds?.length) {
    proceduresData.value = []
    return
  }

  loading.value = true
  error.value = null

  try {
    const procedurePromises = props.procedureIds.map(async (procedureId) => {
      try {
        const { url, options } = await getRequest(procedureId)
        const response = await fetch(url, options)
        const responseData = await response.json()
        const notices = mapResponse(responseData)

        return {
          procedureId,
          notices,
          error: null,
        }
      } catch (err) {
        console.error(`Failed to fetch data for procedure ${procedureId}:`, err)
        return {
          procedureId,
          notices: [],
          error: err.message,
        }
      }
    })

    proceduresData.value = await Promise.all(procedurePromises)
  } catch (err) {
    error.value = err.message || 'Failed to fetch procedure data'
    proceduresData.value = []
  } finally {
    loading.value = false
  }
}

// Watch for changes in procedureIds to fetch data
watch(() => props.procedureIds, () => {
  fetchProceduresData()
}, { immediate: true })

</script>

<template>
  <n-card size="small" class="notice-card">
    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-else-if="loading" class="loading-message">Loading procedures...</div>
    <div v-else-if="proceduresData.length > 0" class="procedures-container">
      <template v-for="procedureData in proceduresData" :key="procedureData.procedureId">
        <Procedure
            :procedureId="procedureData.procedureId"
            :notices="procedureData.notices"
            :publicationNumbers="allPublicationNumbers"
            :error="procedureData.error"
        />
      </template>
    </div>
    <div v-else>
      No procedures found for this notice
    </div>
  </n-card>
</template>

<style scoped>


.notice-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}


.error-message {
  color: #d32f2f;
  background: #ffebee;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.loading-message {
  text-align: center;
  color: #666;
  padding: 20px;
}


</style>
