import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getEntities } from '../../traversers/entities.js'
import { extractEntities } from '../business/extractEntities.js'
import { doSPARQL } from '../../services/doQuery.js'

import { ns } from '../../namespaces.js'
import { useStorage } from '@vueuse/core'
import { getQuery } from '../../facets/facets.js'

const defaultOptions = {
  ignoreNamedGraphs: true, matchers: [
    { predicate: ns.rdf.type, object: ns.epo.ChangeInformation },
    { predicate: ns.rdf.type, object: ns.epo.ResultNotice },
    { predicate: ns.rdf.type, object: ns.epo.Notice },
    {}],
}

export const useSelectionController = defineStore('notice', () => {
  const facetsList = useStorage('facets-v2', [])
  const currentFacetIndex = ref(null)
  const isLoading = ref(false)
  const error = ref(null)
  const results = ref(null)

  const currentFacet = computed(
    () => facetsList.value[currentFacetIndex.value] || null)

  function addFacet(facet) {
    const existingIndex = facetsList.value.findIndex((item) => getQuery(item) === getQuery(facet));
    if (existingIndex !== -1) {
      return existingIndex;
    }
    facetsList.value.push(facet);
    return facetsList.value.length - 1;
  }

  async function removeFacet (index) {

    const isSelected = index === currentFacetIndex.value

    facetsList.value.splice(index, 1)

    if (!isSelected) return

    if (facetsList.value.length > 0) {
      const newIndex = Math.max(0, index - 1) // Select previous facet if possible
      await selectFacet(newIndex)
    }
    results.value = null
  }

  async function selectFacet (facetOrIndex) {

    console.log('selectFacet', facetOrIndex)

    const index = typeof facetOrIndex === 'number' ? facetOrIndex : addFacet(
      facetOrIndex)
    currentFacetIndex.value = index
    await executeQuery(facetsList.value[index])
  }

  async function executeQuery (facet) {
    try {
      isLoading.value = true
      error.value = null
      results.value = null

      const dataset = await doSPARQL(getQuery(facet))
      results.value = {
        entities: getEntities(dataset, defaultOptions),
        extracted: extractEntities({ dataset }),
        stats: { triples: dataset.size },
      }
    } catch (e) {
      error.value = e
    } finally {
      isLoading.value = false
    }
  }

  return {
    facetsList,
    currentFacet,
    currentFacetIndex,
    isLoading,
    error,
    results,
    removeFacet,
    selectFacet,
  }
})

