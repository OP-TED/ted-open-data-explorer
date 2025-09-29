<script setup>
import { computed, watch, ref } from 'vue'
import { NButton, NIcon } from 'naive-ui'
import { ChevronBackOutline, ChevronForwardOutline } from '@vicons/ionicons5'
import { useFacetQuery } from '../../composables/useFacetQuery.js'
import Term from './Term.vue'

const props = defineProps({
  facet: {
    type: Object,
    required: true,
  },
})

const nodeUrl = computed(() => props.facet?.term?.value || '')

const { isLoading, error, results, executeQuery } = useFacetQuery()

const currentOffset = ref(0)
const pageSize = 30
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

function createBacklinkQuery (offset = 0) {
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

const groupedBacklinks = computed(() => {
  if (!results.value?.dataset) return {}
  const groups = {}
  const dataset = results.value.dataset
  for (const quad of dataset) {
    if (quad.object.value === nodeUrl.value) {
      const propertyUrl = quad.predicate.value
      const subjectUrl = quad.subject.value
      if (!groups[propertyUrl]) {
        groups[propertyUrl] = {
          property: propertyUrl,
          propertyTerm: createTermFromUrl(propertyUrl),
          subjects: new Set(),
        }
      }
      groups[propertyUrl].subjects.add(subjectUrl)
    }
  }
  Object.values(groups).forEach(group => {
    group.subjects = Array.from(group.subjects).sort()
  })
  return groups
})

async function loadBacklinks () {
  if (!nodeUrl.value) return
  const query = createBacklinkQuery(currentOffset.value)
  if (!query) return
  await executeQuery(query)
  if (results.value?.dataset) {
    const relationships = new Set()
    for (const quad of results.value.dataset) {
      if (quad.object.value === nodeUrl.value) {
        relationships.add(`${quad.subject.value}|${quad.predicate.value}`)
      }
    }
    hasNextPage.value = relationships.size === pageSize
  }
}

async function nextPage () {
  currentOffset.value += pageSize
  await loadBacklinks()
}

async function prevPage () {
  currentOffset.value = Math.max(0, currentOffset.value - pageSize)
  await loadBacklinks()
}

function createTermFromUrl (url) {
  return {
    termType: 'NamedNode',
    value: url,
  }
}

function getPropertyColor (index) {
  const colors = [
    '#4f46e5', '#059669', '#dc2626', '#d97706',
    '#7c3aed', '#0891b2', '#be185d', '#65a30d',
  ]
  return colors[index % colors.length]
}

watch(nodeUrl, async (newUrl) => {
  if (newUrl) {
    currentOffset.value = 0
    hasNextPage.value = true
    await loadBacklinks()
  }
}, { immediate: true })
</script>

<template>
  <div class="named-node-facet">
    <div class="backlinks-content">
      <div
          v-for="(group, index) in groupedBacklinks"
          :key="group.property"
          class="property-row"
      >
        <div class="subjects">
          <span
              v-for="subjectUrl in group.subjects"
              :key="subjectUrl"
              class="subject-item"
          >
            <Term :term="createTermFromUrl(subjectUrl)"/>
          </span>
        </div>

        <div class="property-with-arrow">
          <span class="property-term">
            <Term :term="group.propertyTerm"/>
          </span>
          <div class="arrow"></div>
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
</template>

<style scoped>
.property-row {
  display: flex;
  align-items: center;
  margin: 0.5rem 0;
}

.subjects {
  flex: 7;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  justify-content: flex-end;

}

.subject-item {
  display: inline-block;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #ddd;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 0.8rem;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  max-width: 200px;
}

.subject-item :deep(div),
.subject-item :deep(a),
.subject-item :deep(span) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  direction: rtl;
  text-align: left;
  max-width: 100%;
}

.property-with-arrow {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.property-term {
  display: inline-block;
  border: 1px solid #ddd;
  border-radius: 3px;
  padding: 6px;
  font-size: 1rem;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.property-with-arrow .arrow {
  width: 100px;
  height: 2px;
  background-color: #666;
  position: relative;
  margin: 0;
}

.property-with-arrow .arrow::after {
  content: "";
  position: absolute;
  right: 0;
  top: -4px;
  border-left: 6px solid #666;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
}

.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding: 8px 0;
  border-top: 1px solid #e0e0e0;
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
