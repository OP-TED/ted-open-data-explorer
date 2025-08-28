<script setup>
import { ShareSocialOutline as ShareIcon } from '@vicons/ionicons5'
import {
  lightTheme,
  NButton,
  NCard,
  NConfigProvider,
  NIcon,
  NInput,
  NMessageProvider,
} from 'naive-ui'
import { onMounted, ref } from 'vue'
import { GridLayout, GridItem } from 'grid-layout-plus'

import SparqlEditor from '../app/Editor.vue'
import { useUrlFacetParams } from '../composables/useUrlFacetParams.js'
import { getQuery } from '../facets/facets.js'
import { createPublicationNumberFacet } from '../facets/noticeQueries.js'
import { doSPARQL } from '../services/doQuery.js'
import { getRandomPublicationNumber } from '../services/randomNoticeService.js'

const sparqlQuery = ref(`
SELECT ?s ?p ?o
WHERE {
  ?s ?p ?o .
}
LIMIT 10
`)

const rulesData = ref(`# Example rules (to be replaced by actual engine)
@prefix ex: <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
`)

const resultData = ref('')
const isLoading = ref(false)
const noticeNumber = ref('')

// Facet-based state management (following Navigator pattern)
const currentFacet = ref(null)
const { getShareableUrl, initFromUrlParams } = useUrlFacetParams()

// Grid layout items for grid-layout-plus
const gridLayout = ref([
  { i: 'search', x: 0, y: 0, w: 6, h: 4, title: 'Search', component: 'search', collapsed: false },
  { i: 'query', x: 6, y: 0, w: 6, h: 8, title: 'SPARQL Query', component: 'query', collapsed: false },
  { i: 'results', x: 0, y: 4, w: 6, h: 8, title: 'Results: Data + Inferred Rules', component: 'results', collapsed: false },
  { i: 'rules', x: 6, y: 8, w: 6, h: 6, title: 'Rules (Turtle)', component: 'rules', collapsed: true },
])

// Toggle collapse state
function toggleCollapse (itemId) {
  const item = gridLayout.value.find(i => i.i === itemId)
  if (item) {
    if (item.collapsed) {
      // Expanding: restore original height
      item.h = item.originalHeight || item.h
      item.collapsed = false
    } else {
      // Collapsing: store original height and set to minimum
      item.originalHeight = item.h
      item.h = 2 // Minimum height for collapsed state (just enough for header)
      item.collapsed = true
    }
  }
}

// Grid layout update handler
function onLayoutUpdated (newLayout) {
  console.log('Grid layout updated:', newLayout)
  gridLayout.value = newLayout
}

function datasetToTriples (dataset, limit = 20) {
  // Normalize into an array (works if dataset is iterable or already an array)
  const triplesArray = Array.from(dataset, q =>
      `${q.subject.value} ${q.predicate.value} ${q.object.value}`,
  )

  return {
    count: triplesArray.length,
    preview: triplesArray.slice(0, limit).join('\n'),
    truncated: triplesArray.length > limit,
  }
}

// Create a facet from notice number and execute query
async function selectFacet (facet) {
  currentFacet.value = facet

  // Update UI based on facet type
  if (facet.type === 'notice-number') {
    noticeNumber.value = facet.value
  }

  // Generate and set the SPARQL query
  sparqlQuery.value = getQuery(facet)

  // Execute the query
  await executeCurrentFacet()
}

async function searchByNoticeNumber () {
  if (!noticeNumber.value.trim()) {
    console.warn('Notice number is required')
    return
  }

  const facet = createPublicationNumberFacet(noticeNumber.value)
  await selectFacet(facet)
}

async function executeCurrentFacet () {
  if (!currentFacet.value) return

  isLoading.value = true
  try {
    const query = getQuery(currentFacet.value)
    const dataset = await doSPARQL(query)
    const { count, preview, truncated } = datasetToTriples(dataset)

    const facetLabel = currentFacet.value.type === 'notice-number'
        ? `Notice Data for: ${currentFacet.value.value}`
        : `Query Results`

    resultData.value = `${facetLabel}

Retrieved ${count} triples:

${preview}${truncated ? '\n... (showing first 20 triples)' : ''}

Inferred Rules: [Pending rules engine output]`
  } catch (error) {
    console.error('Search error:', error)
    resultData.value = `Error executing facet query: ${error.message}`
  } finally {
    isLoading.value = false
  }
}

async function searchRandomNotice () {
  isLoading.value = true
  try {
    noticeNumber.value = await getRandomPublicationNumber()
    await searchByNoticeNumber()
  } catch (error) {
    console.error('Random search error:', error)
    resultData.value = 'Error fetching a random notice.'
    isLoading.value = false
  }
}

async function executeQuery () {
  isLoading.value = true
  try {
    const dataset = await doSPARQL(sparqlQuery.value)
    const { count, preview, truncated } = datasetToTriples(dataset, 30)

    resultData.value = `SPARQL Query Executed:
${sparqlQuery.value}

Retrieved ${count} triples:

${preview}${truncated ? '\n... (showing first 30 triples)' : ''}

Inferred Rules: [Pending rules engine output]`
  } catch (error) {
    console.error('SPARQL execution error:', error)
    resultData.value = `Error executing query: ${error.message}

Query:
${sparqlQuery.value}`
  } finally {
    isLoading.value = false
  }
}

// Facet-based sharing (following Navigator pattern)
async function handleShare () {
  if (!currentFacet.value) {
    console.warn('No facet selected to share')
    return
  }

  const shareUrl = getShareableUrl(currentFacet.value)
  if (!shareUrl) {
    console.error('Failed to generate shareable URL')
    return
  }

  try {
    await navigator.clipboard.writeText(shareUrl)
    console.log('Copied to clipboard:', shareUrl)
  } catch {
    console.error('Failed to copy URL to clipboard')
  }
}

// Initialize from URL parameters on mount
onMounted(async () => {
  try {
    await initFromUrlParams(selectFacet)
  } catch (error) {
    console.error('Failed to initialize from URL params:', error)
  }
})
</script>

<template>
  <n-message-provider>
    <n-config-provider :theme="lightTheme">
      <div class="rules-app">
        <h1>Rules Playground</h1>

        <GridLayout
          :layout="gridLayout"
          :col-num="12"
          :row-height="30"
          :is-draggable="true"
          :is-resizable="true"
          :margin="[10, 10]"
          :use-css-transforms="true"
          @layout-updated="onLayoutUpdated"
        >
          <GridItem
            v-for="item in gridLayout"
            :key="item.i"
            :x="item.x"
            :y="item.y"
            :w="item.w"
            :h="item.h"
            :i="item.i"
            :drag-allow-from="'.card-header'"
            class="grid-item"
          >
            <n-card size="small" style="height: 100%;">
              <template #header>
                <div class="card-header">
                  <div class="header-left">
                    <button @click="toggleCollapse(item.i)" class="collapse-btn">
                      {{ item.collapsed ? '▶' : '▼' }}
                    </button>
                    <span>{{ item.title }}</span>
                  </div>
                  <div class="drag-handle">⋮⋮</div>
                </div>
              </template>

              <!-- Content (conditionally shown based on collapsed state) -->
              <div v-show="!item.collapsed" class="card-content">
                <!-- Search -->
                <div v-if="item.component === 'search'" class="search-content">
                  <div class="search-inputs">
                    <n-input v-model:value="noticeNumber" placeholder="Enter notice number"
                             @keyup.enter="searchByNoticeNumber"/>
                    <n-button secondary @click="searchByNoticeNumber" :loading="isLoading">Search</n-button>
                    <n-button secondary size="small" @click="searchRandomNotice" :loading="isLoading">Random</n-button>
                  </div>
                  <n-button v-if="currentFacet" size="small" type="primary" @click="handleShare">
                    <n-icon>
                      <ShareIcon/>
                    </n-icon>
                  </n-button>
                </div>

                <!-- Query -->
                <div v-else-if="item.component === 'query'" class="query-content">
                  <sparql-editor v-model="sparqlQuery" :isLoading="isLoading" style="height: calc(100% - 50px);"/>
                  <n-button @click="executeQuery" :loading="isLoading" style="margin-top: 8px; align-self: flex-end;">
                    Execute
                  </n-button>
                </div>

                <!-- Rules -->
                <sparql-editor v-else-if="item.component === 'rules'" v-model="rulesData" :isLoading="false"
                               language="turtle" style="height: 100%;"/>

                <!-- Results -->
                <div v-else-if="item.component === 'results'" class="results-content">
                  <pre v-if="resultData">{{ resultData }}</pre>
                  <div v-else class="placeholder">Click "Search Random Notice" to see results here</div>
                </div>
              </div>
            </n-card>
          </GridItem>
        </GridLayout>
      </div>
    </n-config-provider>
  </n-message-provider>
</template>

<style scoped>


.grid-item {
  border-radius: 8px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  cursor: grab;
  user-select: none;
}

.card-header:active {
  cursor: grabbing;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.collapse-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  user-select: none;
}

.collapse-btn:hover {
  background-color: #f0f0f0;
  color: #333;
}

.drag-handle {
  cursor: grab;
  color: #666;
  transition: all 0.2s ease;
  user-select: none;
  padding: 4px 8px;
  border-radius: 4px;
}

.drag-handle:hover {
  background-color: #f0f0f0;
  color: #333;
}

.drag-handle:active {
  cursor: grabbing;
}

.card-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Content layouts */
.search-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.search-inputs {
  display: flex;
  gap: 8px;
  flex: 1;
}

.query-content {
  display: flex;
  flex-direction: column;
}

.results-content {
  min-height: 150px;
  background: #f5f5f5;
  padding: 12px;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.placeholder {
  color: #999;
  font-style: italic;
  text-align: center;
  padding: 20px;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .search-content {
    flex-direction: column;
    align-items: stretch;
  }

  .search-inputs {
    flex-direction: column;
  }
}
</style>
