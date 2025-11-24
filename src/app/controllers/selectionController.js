import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { getQuery } from '../../facets/facets.js'
import {
  facetEquals,
  addUnique,
  removeAt,
  adjustIndex,
  shouldClearResults,
  shouldSelectFacet,
} from '../../facets/facetLogic.js'

import { ns } from '../../namespaces.js'
import { useUrlFacetParams } from '../../composables/useUrlFacetParams.js'
import { useFacetQuery } from '../../composables/useFacetQuery.js'

const defaultOptions = {
  ignoreNamedGraphs: true,
  matchers: [

    { predicate: ns.rdf.type, object: ns.epo.ResultNotice },
    { predicate: ns.rdf.type, object: ns.epo.Notice },
    { predicate: ns.rdf.type, object: ns.epo.ChangeInformation },

    { predicate: ns.epo.specifiesProcurementCriterion },

    {},
  ],
}

export const useSelectionController = defineStore('notice', () => {
  // Composables
  const {
    getShareableUrl: generateShareableUrl,
    initFromUrlParams: initFromUrl,
  } = useUrlFacetParams()
  const {
    isLoading,
    error,
    results,
    executeQuery,
    clearResults,
  } = useFacetQuery()

  // Store-specific state
  // Use sessionStorage instead of localStorage to avoid cross-tab interference
  const facetsList = useStorage('facets-v3', [], sessionStorage)
  const currentFacetIndex = ref(null)

  // Trim named-node facets on initialization if exceeding limit
  const namedNodeFacets = facetsList.value.filter(f => f.type === 'named-node')
  if (namedNodeFacets.length > 10) {
    const excessCount = namedNodeFacets.length - 10
    for (let i = 0; i < excessCount; i++) {
      const oldestIndex = facetsList.value.findIndex(f => f.type === 'named-node')
      if (oldestIndex !== -1) {
        facetsList.value.splice(oldestIndex, 1)
      }
    }
  }

  const currentFacet = computed(
    () => facetsList.value[currentFacetIndex.value] || null,
  )

  // Separate facets by type for different layouts
  const horizontalFacets = computed(() =>
    facetsList.value.filter(facet => facet.type !== 'named-node'),
  )

  const verticalFacets = computed(() =>
    facetsList.value.filter(facet => facet.type === 'named-node'),
  )

  // Wrap composable functions to use current context
  function getShareableUrl () {
    return generateShareableUrl(currentFacet.value)
  }

  async function initFromUrlParams () {
    await initFromUrl(selectFacet)
  }

  function addFacet (facet) {
    let updatedList = facetsList.value

    // If adding a named-node facet, ensure we don't exceed 10
    if (facet.type === 'named-node') {
      const namedNodeFacets = updatedList.filter(f => f.type === 'named-node')
      if (namedNodeFacets.length >= 10) {
        // Remove the oldest named-node facet
        const oldestIndex = updatedList.findIndex(f => f.type === 'named-node')
        updatedList = removeAt(updatedList, oldestIndex)
      }
    }

    const { facets, index } = addUnique(updatedList, facet,
      facetEquals(getQuery))
    facetsList.value = facets
    return index
  }

  async function removeFacet (index) {
    const originalIndex = currentFacetIndex.value
    const newFacets = removeAt(facetsList.value, index)
    const newIndex = adjustIndex(originalIndex, index, newFacets.length)

    facetsList.value = newFacets
    currentFacetIndex.value = newIndex

    if (shouldClearResults(originalIndex, index, newFacets.length)) {
      clearResults()
    } else if (shouldSelectFacet(originalIndex, index, newFacets.length)) {
      await selectFacet(newIndex)
    }
  }

  async function selectFacet (facetOrIndex) {
    currentFacetIndex.value =
      typeof facetOrIndex === 'number' ? facetOrIndex : addFacet(facetOrIndex)
  }

  // Helper function to select facet by reference (for filtered views)
  function selectFacetByReference (facet) {
    const index = facetsList.value.indexOf(facet)
    if (index !== -1) {
      currentFacetIndex.value = index
    }
  }

  watch(currentFacet, async (newVal) => {
    const newQuery = getQuery(newVal)
    await executeQuery(newQuery)
  })

  return {
    facetsList,
    horizontalFacets,
    verticalFacets,
    currentFacet,
    currentFacetIndex,
    isLoading,
    error,
    results,
    removeFacet,
    selectFacet,
    selectFacetByReference,
    getShareableUrl,
    initFromUrlParams,
  }
})

// Export defaultOptions for use in Navigator
export { defaultOptions }
