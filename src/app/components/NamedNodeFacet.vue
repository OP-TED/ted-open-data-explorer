<script setup>
import { computed, watch, ref } from 'vue'
import { NButton, NIcon } from 'naive-ui'
import { ChevronBackOutline, ChevronForwardOutline } from '@vicons/ionicons5'
import { useFacetQuery } from '../../composables/useFacetQuery.js'
import Term from './Term.vue'

const props = defineProps({
  facet: {
    type: Object,
    required: true
  }
})

const nodeUrl = computed(() => props.facet?.term?.value || '')

const displayName = computed(() => {
  const url = nodeUrl.value
  return url.split('/').pop() || url.split('#').pop() || url
})

// Use the facet query composable for backlink data
const { isLoading, error, results, executeQuery } = useFacetQuery()

// Pagination state
const currentOffset = ref(0)
const pageSize = 9
const hasNextPage = ref(true)
const hasPrevPage = computed(() => currentOffset.value > 0)

// Pagination info
const paginationInfo = computed(() => {
  if (!results.value?.dataset) return ''

  // Count relationships in current page
  const relationships = new Set()
  for (const quad of results.value.dataset) {
    if (quad.object.value === nodeUrl.value) {
      relationships.add(`${quad.subject.value}|${quad.predicate.value}`)
    }
  }
  const currentCount = relationships.size

  const start = currentOffset.value + 1
  const end = currentOffset.value + currentCount

  if (hasNextPage.value) {
    return `Showing ${start}-${end} of many`
  } else {
    return `Showing ${start}-${end}`
  }
})

// Backlink query template with pagination
function createBacklinkQuery(offset = 0) {
  if (!nodeUrl.value) return null

  return `PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX epo: <http://data.europa.eu/a4g/ontology#>
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>

CONSTRUCT {
  ?s ?p ?o .
}
WHERE {
  {
    SELECT DISTINCT ?s ?p WHERE {
      VALUES ?o { <${nodeUrl.value}> }
      ?s ?p ?o .
    }
    LIMIT ${pageSize}
    OFFSET ${offset}
  }
  VALUES ?o { <${nodeUrl.value}> }
  ?s ?p ?o .
}`
}

// Process backlink data into grouped structure
const groupedBacklinks = computed(() => {
  if (!results.value?.dataset) return {}

  const groups = {}
  const dataset = results.value.dataset

  // Iterate through all quads where our node is the object
  for (const quad of dataset) {
    if (quad.object.value === nodeUrl.value) {
      const propertyUrl = quad.predicate.value
      const subjectUrl = quad.subject.value

      if (!groups[propertyUrl]) {
        groups[propertyUrl] = {
          property: propertyUrl,
          propertyTerm: createTermFromUrl(propertyUrl),
          subjects: new Set()
        }
      }

      groups[propertyUrl].subjects.add(subjectUrl)
    }
  }

  // Convert Sets to Arrays and sort
  Object.values(groups).forEach(group => {
    group.subjects = Array.from(group.subjects).sort()
  })

  return groups
})

// Load backlinks for current page
async function loadBacklinks() {
  if (!nodeUrl.value) return

  const query = createBacklinkQuery(currentOffset.value)
  if (!query) return

  await executeQuery(query)

  if (results.value?.dataset) {
    // Count distinct subject-predicate pairs to determine if there's a next page
    const relationships = new Set()
    for (const quad of results.value.dataset) {
      if (quad.object.value === nodeUrl.value) {
        relationships.add(`${quad.subject.value}|${quad.predicate.value}`)
      }
    }
    hasNextPage.value = relationships.size === pageSize
  }
}

// Navigate to next page
async function nextPage() {
  currentOffset.value += pageSize
  await loadBacklinks()
}

// Navigate to previous page
async function prevPage() {
  currentOffset.value = Math.max(0, currentOffset.value - pageSize)
  await loadBacklinks()
}

// Helper function to create a term object from a URL
function createTermFromUrl(url) {
  return {
    termType: 'NamedNode',
    value: url
  }
}

// Load backlinks when facet changes
watch(nodeUrl, async (newUrl) => {
  if (newUrl) {
    // Reset state and load initial data
    currentOffset.value = 0
    hasNextPage.value = true
    await loadBacklinks()
  }
}, { immediate: true })
</script>

<template>
  <div class="named-node-facet">
    <div class="backlinks-content">
      <div v-if="isLoading && Object.keys(groupedBacklinks).length === 0" class="loading">Loading backlinks...</div>
      <div v-else-if="error" class="error">Error: {{ error.message }}</div>
      <div v-else-if="Object.keys(groupedBacklinks).length === 0" class="no-backlinks">
        No backlinks found
      </div>
      <div v-else class="property-sections">
        <div
          v-for="(group, propertyUrl) in groupedBacklinks"
          :key="propertyUrl"
          class="property-section"
        >
          <h4 class="property-label">
            Incoming <Term :term="group.propertyTerm" /> links
          </h4>
          <div class="subjects-container">
            <div
              v-for="subjectUrl in group.subjects"
              :key="subjectUrl"
              class="subject-card"
            >
              <Term :term="createTermFromUrl(subjectUrl)" />
            </div>
          </div>
        </div>

        <!-- Pagination Controls -->
        <div v-if="hasPrevPage || hasNextPage" class="pagination-container">
          <span class="pagination-info">
            {{ paginationInfo }}
            <span v-if="isLoading && Object.keys(groupedBacklinks).length > 0" class="loading-indicator">
              Loading...
            </span>
          </span>
          <div class="pagination-buttons">
            <n-button
              size="small"
              :disabled="!hasPrevPage || isLoading"
              @click="prevPage"
              secondary
            >
              <n-icon>
                <ChevronBackOutline/>
              </n-icon>
            </n-button>
            <n-button
              size="small"
              :disabled="!hasNextPage || isLoading"
              @click="nextPage"
              secondary
            >
              <n-icon>
                <ChevronForwardOutline/>
              </n-icon>
            </n-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.named-node-facet {
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.backlinks-content {
  flex: 1;
  min-height: 0;
}

.loading, .error, .no-backlinks {
  text-align: center;
  font-style: italic;
}

.error {
  color: #d32f2f;
  background: #ffebee;
  border-radius: 4px;
}

.property-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.property-section {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px;
  background: #fafafa;
}

.property-label {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #ddd;
  padding-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
}

.subjects-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.subject-card {
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: .8rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  text-overflow: ellipsis;
  overflow: hidden;
  direction: rtl; /* reverse text flow */
  text-align: left; /* fix alignment so the end stays visible */
  max-width: 300px;
}

.subject-card :deep(div),
.subject-card :deep(a),
.subject-card :deep(span) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  direction: rtl;
  text-align: left;
  max-width: 100%;
}

.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.pagination-info {
  font-size: 14px;
  color: #666;
}

.loading-indicator {
  margin-left: 8px;
  font-size: 12px;
  color: #999;
  font-style: italic;
}

.pagination-buttons {
  display: flex;
  gap: 2px;
}
</style>
