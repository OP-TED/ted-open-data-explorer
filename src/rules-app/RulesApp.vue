<script setup>
import { ShareSocialOutline as ShareIcon } from '@vicons/ionicons5'
import {
  lightTheme,
  NButton,
  NCard,
  NCollapse,
  NCollapseItem,
  NConfigProvider,
  NIcon,
  NInput,
  NMessageProvider,
  NSpace,
} from 'naive-ui'
import { onMounted, ref } from 'vue'

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


function datasetToTriples(dataset, limit = 20) {
  // Normalize into an array (works if dataset is iterable or already an array)
  const triplesArray = Array.from(dataset, q =>
      `${q.subject.value} ${q.predicate.value} ${q.object.value}`
  )

  return {
    count: triplesArray.length,
    preview: triplesArray.slice(0, limit).join('\n'),
    truncated: triplesArray.length > limit,
  }
}


// Create a facet from notice number and execute query
async function selectFacet(facet) {
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

async function executeCurrentFacet() {
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
async function handleShare() {
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

        <n-space vertical size="large">
          <!-- Search Section -->
          <n-card title="Search">
            <n-space justify="space-between" align="center" class="search-bar">
              <n-space>
                <n-input
                    v-model:value="noticeNumber"
                    placeholder="Enter notice number"
                    @keyup.enter="searchByNoticeNumber"
                    style="width: 300px;"
                />
                <n-button secondary @click="searchByNoticeNumber" :loading="isLoading">
                  Search
                </n-button>
                <n-button secondary size="small" @click="searchRandomNotice" :loading="isLoading">
                  Random
                </n-button>
              </n-space>

              <n-button
                  v-if="currentFacet"
                  size="small"
                  type="primary"
                  @click="handleShare"
              >
                <n-icon>
                  <ShareIcon/>
                </n-icon>
              </n-button>
            </n-space>
          </n-card>

          <!-- SPARQL Query -->
          <n-collapse>
            <n-collapse-item title="SPARQL Query" name="query">
              <div class="query-editor">
                <sparql-editor v-model="sparqlQuery" :isLoading="isLoading"/>
                <n-button @click="executeQuery" :loading="isLoading" class="editor-button">
                  Execute Query
                </n-button>
              </div>
            </n-collapse-item>
          </n-collapse>

          <!-- Rules Editor -->
          <n-card title="Rules (Turtle)" class="editor-card">
            <sparql-editor
                v-model="rulesData"
                :isLoading="false"
                language="turtle"
                style="height: 300px;"
            />
          </n-card>

          <!-- Results -->
          <n-card title="Results: Data + Inferred Rules">
            <div class="results-area">
              <pre v-if="resultData">{{ resultData }}</pre>
              <div v-else class="placeholder">
                Click "Search Random Notice" to see results here
              </div>
            </div>
          </n-card>
        </n-space>
      </div>
    </n-config-provider>
  </n-message-provider>
</template>

<style scoped>
.rules-app {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.query-editor {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.editor-card {
  min-height: 350px;
}

.results-area {
  min-height: 200px;
  background: #f5f5f5;
  padding: 16px;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.search-bar {
  width: 100%;
  padding: 8px;
}

.placeholder {
  color: #999;
  font-style: italic;
  text-align: center;
  padding: 40px;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}

.editor-button {
  margin-top: 8px;
}

@media (max-width: 768px) {
  .query-editor {
    align-items: stretch;
  }
}
</style>
