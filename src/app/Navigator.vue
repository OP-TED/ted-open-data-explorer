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
import { ref, watch, computed, onMounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { ShareSocialOutline as ShareIcon } from '@vicons/ionicons5'
import { GridLayout } from 'grid-layout-plus'
import AutoHeightItem from './AutoHeightItem.vue'
import { getQuery } from '../facets/facets.js'
import Notice from './components/Notice.vue'
import Data from './components/Data.vue'
import SparqlEditor from './components/SparqlEditor.vue'
import FacetsList from './FacetsList.vue'
import { useSelectionController, defaultOptions } from './controllers/selectionController.js'
import { createPublicationNumberFacet } from '../facets/noticeQueries.js'
import { getRandomPublicationNumber } from '../services/randomNoticeService.js'

const selectionController = useSelectionController()
const { currentFacet, horizontalFacets, verticalFacets, error, isLoading, results } = storeToRefs(selectionController)
const message = useMessage()

const noticeNumber = ref('')

function searchByNoticeNumber () {
  if (!noticeNumber.value.trim()) {
    console.warn('Notice number is required')
    return
  }
  const facet = createPublicationNumberFacet(noticeNumber.value)
  if (facet) selectionController.selectFacet(facet)
}

async function handleSelectRandom () {
  noticeNumber.value = await getRandomPublicationNumber()
  searchByNoticeNumber()
}

async function handleShare () {
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

const gridLayout = ref([
  { i: 'search', x: 0, y: 0, w: 6, h: 3, title: 'Search', component: 'search', collapsed: false },
  { i: 'query', x: 6, y: 0, w: 6, h: 3, title: 'SPARQL Query', component: 'query', collapsed: true, originalHeight: 6 },
  { i: 'facets-1', x: 0, y: 3, w: 12, h: 5, title: 'Facets-1', component: 'facets-1', collapsed: false },
  { i: 'facets-2', x: 10, y: 15, w: 2, h: 22, title: 'History', component: 'facets-2', collapsed: false },
  { i: 'context', x: 0, y: 8, w: 12, h: 7, title: 'Context', component: 'context', collapsed: false },
  { i: 'data', x: 0, y: 15, w: 10, h: 25, title: 'Data', component: 'data', collapsed: false },
])

const gridRef = ref(null)

async function toggleCollapse (itemId) {
  const item = gridLayout.value.find(i => i.i === itemId)
  if (!item) return

  if (item.collapsed) {
    item.h = item.originalHeight || item.h
    item.collapsed = false
  } else {
    item.originalHeight = item.h
    item.h = 2
    item.collapsed = true
  }

  requestAnimationFrame(async () => {
    await nextTick()
    const newLayout = JSON.parse(JSON.stringify(gridLayout.value))
    gridLayout.value.splice(0, gridLayout.value.length, ...newLayout)

    if (gridRef.value && gridRef.value.layoutUpdate) {
      gridRef.value.layoutUpdate()
    }
  })
}

function onLayoutUpdated (newLayout) {
  gridLayout.value = newLayout
}

async function updateItemHeight (id, newHeight) {
  const item = gridLayout.value.find(item => item.i === id)
  if (item && item.h !== newHeight && !item.collapsed) {

    requestAnimationFrame(async () => {
      item.h = newHeight
      await nextTick()
      const newLayout = JSON.parse(JSON.stringify(gridLayout.value))
      gridLayout.value.splice(0, gridLayout.value.length, ...newLayout)

      if (gridRef.value && gridRef.value.layoutUpdate) {
        gridRef.value.layoutUpdate()
      }
    })
  }
}

const getContextTitle = computed(() => {
  const item = gridLayout.value.find(i => i.i === 'context')
  if (!item) return 'Facet'
  const hasNotice = currentFacet.value?.type === 'notice-number' && currentFacet.value?.value
  if (hasNotice) {
    return `Notice - ${currentFacet.value.value}`
  }
  return 'Facet'
})

const getDataTitle = computed(() => {
  const hasData = results.value?.dataset
  if (hasData) {
    const tripleCount = results.value.dataset.size
    return `Data (${tripleCount.toLocaleString()} triples)`
  }
  return 'Data'
})

// Navigation facets for Data component - navigate through ALL facets in order
const currentFacetIndex = computed(() => {
  if (!currentFacet.value) return -1
  return selectionController.facetsList.findIndex(facet => facet === currentFacet.value)
})

const previousFacet = computed(() => {
  if (currentFacetIndex.value <= 0) return null
  return selectionController.facetsList[currentFacetIndex.value - 1]
})

const nextFacet = computed(() => {
  if (currentFacetIndex.value === -1 || currentFacetIndex.value >= selectionController.facetsList.length -
      1) return null
  return selectionController.facetsList[currentFacetIndex.value + 1]
})
</script>

<template>
  <n-message-provider>
    <n-config-provider :theme="lightTheme">
      <div class="navigator-app">
        <GridLayout
            ref="gridRef"
            :layout="gridLayout"
            :col-num="12"
            :row-height="30"
            :is-draggable="true"
            :is-resizable="true"
            :margin="[10, 10]"
            :use-css-transforms="true"
            :vertical-compact="true"
            :prevent-collision="false"
            :auto-size="true"
            @layout-updated="onLayoutUpdated"
        >
          <AutoHeightItem
              v-for="item in gridLayout"
              :key="item.i"
              :x="item.x"
              :y="item.y"
              :w="item.w"
              :h="item.h"
              :i="item.i"
              :drag-allow-from="'.card-header'"
              :row-height="30"
              class="grid-item"
              @update:h="updateItemHeight(item.i, $event)"
          >
            <n-card size="small" style="height: 100%;">
              <template #header>
                <div class="card-header">
                  <div class="header-left">
                    <button @click="toggleCollapse(item.i)" class="collapse-btn">
                      {{ item.collapsed ? '▶' : '▼' }}
                    </button>
                    <span>{{
                        item.i === 'context' ? getContextTitle : (item.i === 'data' ? getDataTitle : item.title)
                      }}</span>
                  </div>
                  <div class="drag-handle">⋮⋮</div>
                </div>
              </template>
              <!-- Content (conditionally shown based on collapsed state) -->
              <div v-show="!item.collapsed" class="card-content">
                <!-- Search Panel -->
                <div v-if="item.component === 'search'" class="search-content">
                  <div class="search-inputs">
                    <n-input v-model:value="noticeNumber" placeholder="Enter notice number"
                             @keyup.enter="searchByNoticeNumber"/>
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
                  <SparqlEditor v-model="editorQuery" :isLoading="isLoading" style="height: calc(100% - 50px);"/>
                  <n-button @click="doSparql(editorQuery)" :loading="isLoading"
                            style="margin-top: 8px; align-self: flex-end;">
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
                    <Notice :publicationNumber="currentFacet.value"/>
                  </div>
                  <div v-else class="placeholder">
                  </div>
                </div>
                <!-- Data Panel (RDF Tree) -->
                <Data v-else-if="item.component === 'data'"
                      :error="error"
                      :isLoading="isLoading"
                      :dataset="results?.dataset"
                      :previousFacet="previousFacet"
                      :nextFacet="nextFacet"/>
              </div>
            </n-card>
          </AutoHeightItem>
        </GridLayout>
      </div>
    </n-config-provider>
  </n-message-provider>
</template>

<style>
.navigator-app {
  padding: 20px;
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
}

.collapse-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  padding-left: 8px;
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
  border-radius: 4px;
}

.drag-handle:hover {
  background-color: #f0f0f0;
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
