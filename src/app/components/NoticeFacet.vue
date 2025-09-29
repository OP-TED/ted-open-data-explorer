<script setup>
import { computed, ref, watch } from 'vue'
import { NCard } from 'naive-ui'
import Procedure from './Procedure.vue'
import { getRequest, mapResponse, getNoticeByPublicationNumber, extractProcedureIds } from '../../services/tedAPI.js'

const props = defineProps({
  facet: {
    type: Object,
    required: true,
  },
})

// Check if this facet is a notice-number type
const isNoticeFacet = computed(() => {
  return props.facet?.type === 'notice-number' && props.facet?.value
})

// Get the publication number from the facet
const publicationNumber = computed(() => {
  return props.facet?.value || ''
})

// State for managing procedure data for this notice
const proceduresData = ref([])
const loading = ref(false)
const error = ref(null)

// State for notice metadata
const noticeMetadata = ref({
  publicationDate: null,
  buyerCountry: null,
  customizationId: null,
})

// Fetch procedure data for all procedures associated with this notice
async function fetchProceduresData () {
  if (!publicationNumber.value) {
    proceduresData.value = []
    return
  }

  loading.value = true
  error.value = null

  try {
    // Step 1: Get the notice to extract procedure identifiers and metadata
    const { url: noticeUrl, options: noticeOptions } = await getNoticeByPublicationNumber(publicationNumber.value)
    const noticeResponse = await fetch(noticeUrl, noticeOptions)
    const noticeData = await noticeResponse.json()

    // Extract notice metadata
    const firstNotice = noticeData?.notices?.[0]
    if (firstNotice) {
      noticeMetadata.value = {
        publicationDate: firstNotice['publication-date'] || null,
        buyerCountry: firstNotice['buyer-country']?.value || firstNotice['buyer-country'] || null,
        customizationId: firstNotice['customization-id'] || null,
      }
    }

    // Step 2: Extract procedure IDs from the notice data
    const procedureIds = extractProcedureIds(noticeData)

    if (!procedureIds.length) {
      proceduresData.value = []
      return
    }

    // Step 3: Fetch full procedure data for each procedure ID
    const procedurePromises = procedureIds.map(async (procedureId) => {
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

// Watch for changes in publicationNumber to fetch data
watch(publicationNumber, () => {
  fetchProceduresData()
}, { immediate: true })
</script>

<template>
  <div v-if="isNoticeFacet" class="notice-facet">
    <n-card size="small" class="notice-card">
      <div v-if="noticeMetadata.publicationDate || noticeMetadata.buyerCountry || noticeMetadata.customizationId"
           class="notice-metadata">
        <span v-if="noticeMetadata.publicationDate" class="metadata-item">{{ noticeMetadata.publicationDate }}</span>
        <span v-if="noticeMetadata.buyerCountry" class="metadata-item">{{ noticeMetadata.buyerCountry }}</span>
        <span v-if="noticeMetadata.customizationId" class="metadata-item">{{ noticeMetadata.customizationId }}</span>
      </div>
      <div v-if="error" class="error-message">{{ error }}</div>
      <div v-else-if="loading" class="loading-message">Loading procedures...</div>
      <div v-else-if="proceduresData.length > 0" class="procedures-container">
        <template v-for="procedureData in proceduresData" :key="procedureData.procedureId">
          <Procedure
              :procedureId="procedureData.procedureId"
              :notices="procedureData.notices"
              :publicationNumbers="[publicationNumber]"
              :error="procedureData.error"
          />
        </template>
      </div>
      <div v-else>
        No procedures found for this notice
      </div>
    </n-card>
  </div>
  <div v-else class="placeholder">
    <!-- Placeholder for non-notice facets -->
  </div>
</template>

<style scoped>
.notice-facet {
  height: 100%;
  overflow-y: auto;
}

.placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-style: italic;
}

.notice-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.notice-metadata {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 0.8em;
  color: #666;
}

.metadata-item {
  white-space: nowrap;
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
