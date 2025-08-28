<script setup>
import {
  NSpace,
  NButton,
  NInput,
  NIcon,
  NCard,
  NConfigProvider,
  NMessageProvider,
  lightTheme,
  useMessage,
} from 'naive-ui'
import { ref, watch, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { ShareSocialOutline as ShareIcon } from '@vicons/ionicons5'
import { GridLayout, GridItem } from 'grid-layout-plus'
import { getQuery } from '../facets/facets.js'
import Notice from './components/Notice.vue'
import Term from './components/Term.vue'
import { RdfTree } from 'rdf-tree'
import 'rdf-tree/dist/rdf-tree.css'
import grapoi from 'grapoi'
import rdf from 'rdf-ext'

import FacetsList from './FacetsList.vue'
import SparqlEditor from './Editor.vue'
import { useSelectionController, defaultOptions } from './controllers/selectionController.js'
import { createPublicationNumberFacet } from '../facets/noticeQueries.js'
import { getRandomPublicationNumber } from '../services/randomNoticeService.js'

const selectionController = useSelectionController()
const { currentFacet, horizontalFacets, verticalFacets, error, isLoading, results } =
    storeToRefs(selectionController)
const message = useMessage()

// Search functionality
const noticeNumber = ref('')

// Note: Procedure data management now handled by Notice components

function searchByNoticeNumber() {
  if (!noticeNumber.value.trim()) {
    console.warn('Notice number is required')
    return
  }
  const facet = createPublicationNumberFacet(noticeNumber.value)
  if (facet) selectionController.selectFacet(facet)
}

async function handleSelectRandom() {
  noticeNumber.value = await getRandomPublicationNumber()
  searchByNoticeNumber()
}

// Note: Procedure data fetching now handled by individual Notice components

async function handleShare() {
  const url = selectionController.getShareableUrl()
  if (url) {
    try {
      await navigator.clipboard.writeText(url)
      message.success('URL copied to clipboard')
    } catch {
      message.error('Failed to copy URL')
    }
  }
}

function doSparql (query) {
  selectionController.selectFacet({
    type: 'query',
    query,
  })
}

const editorQuery = ref('')
watch(currentFacet, async (newFacet) => {
  editorQuery.value = getQuery(newFacet)
})

// Note: Individual Notice components handle their own data fetching

// Grid layout items for grid-layout-plus
const gridLayout = ref([
  { i: 'search', x: 0, y: 0, w: 6, h: 3, title: 'Search', component: 'search', collapsed: false },
  { i: 'query', x: 6, y: 0, w: 6, h: 3, title: 'SPARQL Query', component: 'query', collapsed: true, originalHeight: 6 },
  { i: 'facets-1', x: 0, y: 3, w: 12, h: 5, title: 'Facets-1', component: 'facets-1', collapsed: false },
  { i: 'facets-2', x: 10, y: 15, w: 2, h: 22, title: 'History', component: 'facets-2', collapsed: false },
  { i: 'context', x: 0, y: 8, w: 12, h: 7, title: 'Context', component: 'context', collapsed: false },
  { i: 'data', x: 0, y: 15, w: 10, h: 25, title: 'Data', component: 'data', collapsed: false },
])

// Toggle collapse state with dynamic height adjustment
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
  gridLayout.value = newLayout
}

// Create a pointer for the RdfTree component from the dataset
const rdfPointer = computed(() => {
  if (!results.value?.dataset) return null

  // Create a grapoi pointer from the dataset - RdfTree will handle entity processing
  const dataset = results.value.dataset
  return grapoi({ dataset, factory: rdf })
})

// Dynamic title for context panel
const getContextTitle = computed(() => {
  const item = gridLayout.value.find(i => i.i === 'context')
  if (!item) return 'Facet'
  
  const hasNotice = currentFacet.value?.type === 'notice-number' && currentFacet.value?.value
  
  if (hasNotice) {
    return `Notice - ${currentFacet.value.value}`
  }
  
  return 'Facet'
})

// Dynamic title for data panel with triple count
const getDataTitle = computed(() => {
  const hasData = results.value?.dataset && results.value?.stats?.triples
  
  if (hasData) {
    const tripleCount = results.value.stats.triples
    return `Data (${tripleCount} triples)`
  }
  
  return 'Data'
})


</script>


<template>
  <n-message-provider>
    <n-config-provider :theme="lightTheme">
      <div class="navigator-app">
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
                    <span>{{ item.i === 'context' ? getContextTitle : (item.i === 'data' ? getDataTitle : item.title) }}</span>
                  </div>
                  <div class="drag-handle">⋮⋮</div>
                </div>
              </template>

              <!-- Content (conditionally shown based on collapsed state) -->
              <div v-show="!item.collapsed" class="card-content">
                <!-- Search Panel -->
                <div v-if="item.component === 'search'" class="search-content">
                  <div class="search-inputs">
                    <n-input 
                      v-model:value="noticeNumber" 
                      placeholder="Enter notice number"
                      @keyup.enter="searchByNoticeNumber"
                    />
                    <n-button secondary @click="searchByNoticeNumber" :loading="isLoading">
                      Search
                    </n-button>
                    <n-button secondary size="small" @click="handleSelectRandom" :loading="isLoading">
                      Random
                    </n-button>
                  </div>
                  <n-button v-if="currentFacet" size="small" type="primary" @click="handleShare">
                    <n-icon>
                      <ShareIcon/>
                    </n-icon>
                  </n-button>
                </div>

                <!-- SPARQL Query Panel -->
                <div v-else-if="item.component === 'query'" class="query-content">
                  <sparql-editor 
                    v-model="editorQuery" 
                    :isLoading="isLoading" 
                    style="height: calc(100% - 50px);"
                  />
                  <n-button 
                    @click="doSparql(editorQuery)" 
                    :loading="isLoading" 
                    style="margin-top: 8px; align-self: flex-end;"
                  >
                    Execute Query
                  </n-button>
                </div>

                <!-- Facets-1 Panel -->
                <div v-else-if="item.component === 'facets-1'" class="facets-content">
                  <FacetsList :facets="horizontalFacets"/>
                </div>

                <!-- Facets-2 Panel -->
                <div v-else-if="item.component === 'facets-2'" class="facets-content">
                  <FacetsList :facets="verticalFacets"/>
                </div>

                <!-- Context Panel (Procedures/Entities) -->
                <div v-else-if="item.component === 'context'" class="context-content">
                  <div v-if="currentFacet?.type === 'notice-number' && currentFacet?.value">
                    <Notice
                      :publicationNumber="currentFacet.value"
                      :procedureIds="results?.extracted?.procedureIds || []"
                      :allPublicationNumbers="results?.extracted?.publicationNumbers || []"
                    />
                  </div>
                  <div v-else class="placeholder">
                    Select a notice to see extracted entities and procedures
                  </div>
                </div>

                <!-- Data Panel (RDF Tree) -->
                <div v-else-if="item.component === 'data'" class="data-content">
                  <div v-if="error" class="error-message">{{ error.message }}</div>
                  <div v-else-if="isLoading" class="loading-message">Loading...</div>
                  <template v-else-if="results?.dataset && rdfPointer">
                    <RdfTree
                      :pointer="rdfPointer"
                      :options="defaultOptions"
                      :enableHighlighting="false"
                      :enableRightClick="false"
                      :termComponent="Term"
                      style="height: 100%; overflow-y: auto;"
                    />
                  </template>
                  <div v-else class="placeholder">
                    Execute a query to see RDF data
                  </div>
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
.navigator-app {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  height: 100vh;
}

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

/* Panel-specific content styles */
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

.facets-content {
  height: 100%;
  overflow-y: auto;
}

.context-content {
  height: 100%;
  overflow-y: auto;
  padding: 8px 0;
}

.data-content {
  height: 100%;
  overflow-y: auto;
}

.placeholder {
  color: #999;
  font-style: italic;
  text-align: center;
  padding: 20px;
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
