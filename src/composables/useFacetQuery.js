import { ref, readonly } from 'vue'
import { doSPARQL } from '../services/doQuery.js'

/**
 * Composable for handling SPARQL query execution and result management
 * Extracted from selectionController for better separation of concerns
 */
export function useFacetQuery () {
  const isLoading = ref(false)
  const error = ref(null)
  const results = ref(null)

  /**
   * Execute a SPARQL query and process the results
   * @param {string} query - The SPARQL query to execute
   */
  async function executeQuery (query) {
    try {
      isLoading.value = true
      error.value = null
      results.value = null

      const dataset = await doSPARQL(query)
      // const extracted = extractEntities({ dataset });

      results.value = {
        dataset,
        // extracted,
        stats: {
          triples: dataset.size,
          executionTime: Date.now(), // Enhanced stats
        },
      }
    } catch (e) {
      error.value = e
      console.error('Query execution failed:', e)
      // Could add retry logic here in the future
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Clear query results and errors
   */
  function clearResults () {
    results.value = null
    error.value = null
  }

  return {
    // Read-only reactive state
    isLoading: readonly(isLoading),
    error: readonly(error),
    results: readonly(results),

    // Actions
    executeQuery,
    clearResults,
  }
}
