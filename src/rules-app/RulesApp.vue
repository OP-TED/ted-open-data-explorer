<script setup>
import {
  lightTheme,
  NConfigProvider,
  NMessageProvider,
  NSpace,
  NButton,
  NCard,
  NInput,
  NIcon,
  NCollapse,
  NCollapseItem,
} from 'naive-ui'
import { ref } from 'vue'
import { ShareSocialOutline as ShareIcon } from '@vicons/ionicons5'

import SparqlEditor from '../app/Editor.vue'
import { doSPARQL } from '../services/doQuery.js'
import { getRandomPublicationNumber } from '../services/randomNoticeService.js'

// State for the editors
const sparqlQuery = ref(`SELECT ?s ?p ?o
WHERE {
  ?s ?p ?o .
}
LIMIT 10`)

const rulesData = ref(`@prefix ex: <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

# Example rule - will be replaced with actual rule engine later
`)

const resultData = ref('')
const isLoading = ref(false)

// Search functionality (similar to TopBar)
const noticeNumber = ref('')

// Search functions
async function searchByNoticeNumber() {
  if (!noticeNumber.value.trim()) {
    console.warn('Please enter a notice number')
    return
  }
  
  isLoading.value = true
  try {
    // Create SPARQL query to get notice data
    const query = `
      PREFIX epo: <http://data.europa.eu/a4g/ontology#>
      
      CONSTRUCT {
        ?notice ?p ?o .
        ?notice epo:hasNoticePublicationNumber "${noticeNumber.value}" .
      }
      WHERE {
        ?notice epo:hasNoticePublicationNumber "${noticeNumber.value}" ;
                ?p ?o .
      }
      LIMIT 100
    `
    
    // Execute the query
    const dataset = await doSPARQL(query)
    
    // Convert dataset to readable format
    const triples = []
    for (const quad of dataset) {
      triples.push(`${quad.subject.value} ${quad.predicate.value} ${quad.object.value}`)
    }
    
    resultData.value = `Notice Data for: ${noticeNumber.value}

Retrieved ${triples.length} triples:

${triples.slice(0, 20).join('\n')}
${triples.length > 20 ? '\n... (showing first 20 triples)' : ''}

Inferred Rules: [Rules engine output will be displayed]`

  } catch (error) {
    console.error('Error searching for notice:', error)
    resultData.value = `Error searching for notice ${noticeNumber.value}: ${error.message}`
  } finally {
    isLoading.value = false
  }
}

async function searchRandomNotice() {
  isLoading.value = true
  try {
    // Get actual random publication number from TED data
    const randomNotice = await getRandomPublicationNumber()
    noticeNumber.value = randomNotice
    
    // Search for the notice data
    await searchByNoticeNumber()
  } catch (error) {
    console.error('Error searching for random notice:', error)
    resultData.value = 'Error occurred while searching for random notice'
    isLoading.value = false
  }
}

async function executeQuery() {
  isLoading.value = true
  try {
    // Execute the current SPARQL query
    const dataset = await doSPARQL(sparqlQuery.value)
    
    // Convert dataset to readable format
    const triples = []
    for (const quad of dataset) {
      triples.push(`${quad.subject.value} ${quad.predicate.value} ${quad.object.value}`)
    }
    
    resultData.value = `SPARQL Query Executed:
${sparqlQuery.value}

Retrieved ${triples.length} triples:

${triples.slice(0, 30).join('\n')}
${triples.length > 30 ? '\n... (showing first 30 triples)' : ''}

Inferred Rules: [Rules engine output will be displayed]`

  } catch (error) {
    console.error('Error executing SPARQL:', error)
    resultData.value = `Error executing SPARQL query: ${error.message}

Query:
${sparqlQuery.value}`
  } finally {
    isLoading.value = false
  }
}

async function handleShare() {
  // TODO: Implement actual sharing with current state
  const currentUrl = window.location.href
  const shareUrl = `${currentUrl}?notice=${encodeURIComponent(noticeNumber.value)}&sparql=${encodeURIComponent(sparqlQuery.value)}&rules=${encodeURIComponent(rulesData.value)}`
  
  try {
    await navigator.clipboard.writeText(shareUrl)
    console.log('URL copied to clipboard:', shareUrl)
  } catch {
    console.error('Failed to copy URL')
  }
}
</script>

<template>
  <n-message-provider>
    <n-config-provider :theme="lightTheme">
      <div class="rules-app">
        <h1>Rules Playground</h1>
        
        <n-space vertical size="large">
          <!-- Search Bar -->
          <n-card title="Search">
            <n-space justify="space-between" align="center" class="search-bar">
              <n-space>
                <n-input
                  v-model:value="noticeNumber"
                  placeholder="Enter notice number"
                  @keyup.enter="searchByNoticeNumber"
                  style="width: 300px;"
                />
                <n-button secondary @click="searchByNoticeNumber" :loading="isLoading">Search</n-button>
                <n-button secondary size="small" @click="searchRandomNotice" :loading="isLoading">Random</n-button>
              </n-space>
              <n-button
                v-if="noticeNumber || resultData"
                size="small"
                type="primary"
                @click="handleShare"
              >
                <n-icon><ShareIcon /></n-icon>
              </n-button>
            </n-space>
          </n-card>

          <!-- SPARQL Query in collapse (like Navigator) -->
          <n-collapse>
            <n-collapse-item title="SPARQL Query" name="query">
              <div
                style="
                  display: flex;
                  flex-direction: column;
                  align-items: flex-end;
                "
              >
                <sparql-editor
                  v-model="sparqlQuery"
                  :isLoading="isLoading"
                />
                <n-button
                  @click="executeQuery"
                  :loading="isLoading"
                  class="editor-button"
                >
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
              style="height: 300px;"
              :language="'turtle'"
            />
          </n-card>

          <!-- Results Section -->
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

.editors-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.editor-card {
  min-height: 350px;
}

.results-area {
  min-height: 200px;
  background-color: #f5f5f5;
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

@media (max-width: 768px) {
  .editors-section {
    grid-template-columns: 1fr;
  }
}
</style>
