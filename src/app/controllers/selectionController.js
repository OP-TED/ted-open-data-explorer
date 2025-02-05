import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getEntities } from '../../traversers/entities.js'
import { extractEntities } from '../business/extractEntities.js'
import { doSPARQL } from '../../services/doQuery.js'

import { ns } from '../../namespaces.js'
import { useStorage } from '@vueuse/core'
import { getLabel, getQuery } from './facets.js'

const defaultOptions = {
  ignoreNamedGraphs: true, matchers: [
    { predicate: ns.rdf.type, object: ns.epo.ChangeInformation },
    { predicate: ns.rdf.type, object: ns.epo.ResultNotice },
    { predicate: ns.rdf.type, object: ns.epo.Notice },
    {}],
}

export const useSelectionController = defineStore('notice', () => {
  const error = ref(null)
  const isLoading = ref(false)
  const results = ref(false)
  const facetsList = useStorage('facets-v1', [])
  const currentQuery = ref()

  async function executeQuery (query) {
    try {
      isLoading.value = true
      results.value = undefined
      error.value = null

      const dataset = await doSPARQL(query)
      const entities = getEntities(dataset, defaultOptions)
      const extracted = extractEntities({ dataset })
      const stats = {
        triples: dataset.size,
      }
      results.value = {
        entities, extracted, stats,
      }
      currentQuery.value = query
    } catch (e) {
      error.value = e
    } finally {
      isLoading.value = false
    }
  }

  async function removeFacetByIndex (index) {
    const isSelected = index === selectedFacetIndex.value

    // Remove the facet
    facetsList.value.splice(index, 1)

    if (!isSelected) return

    results.value = undefined

    if (facetsList.value.length > 0) {
      const newIndex = Math.max(0, index - 1) // Select previous facet if possible
      await selectFacetByIndex(newIndex)
    } else {
      currentQuery.value = ''
    }
  }

  const selectedFacetIndex = computed(
    () => facetsList.value.findIndex(
      (facet) => getQuery(facet) === currentQuery.value))

  async function executeFacetQuery (facet) {
    const query = getQuery(facet)
    await executeQuery(query)
  }

  function addFacetIfMissing (facet) {
    if (!facetsList.value.some(item => getQuery(item) === getQuery(facet))) {
      facetsList.value.push(facet)
    }
  }

  async function selectFacetByIndex (index) {
    const facet = facetsList.value[index]
    await executeFacetQuery(facet)
  }

  async function searchFacet (facet) {
    addFacetIfMissing({ ...facet, label: getLabel(facet) })
    await executeFacetQuery(facet)
  }

  return {
    currentQuery,
    searchFacet,
    error,
    isLoading,
    results,
    selectedHistoryIndex: selectedFacetIndex,
    facetsList,
    selectFacetByIndex,
    removeFacetByIndex,
  }
})
