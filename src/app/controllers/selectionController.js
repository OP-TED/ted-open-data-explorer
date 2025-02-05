import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { getEntities } from '../../traversers/entities.js'
import { extractEntities } from '../business/extractEntities.js'
import { doSPARQL } from '../../services/doQuery.js'
import getNoticeByPublicationNumber
  from '../../queries/getNoticeByPublicationNumber.js'
import { describeWithPragma } from '../../queries/getTermDescriptionQuery.js'
import { ns } from '../../namespaces.js'
import { useStorage } from '@vueuse/core'

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

  const addFacetToList = (facet) => {
    const exists = facetsList.value.some((item) => item.query === facet.query)
    if (!exists) {
      facetsList.value.push(facet)
    }
  }

  async function removeFacetByIndex (index) {
    if (index === selectedFacetIndex.value) {
      results.value = undefined
      facetsList.value.splice(index, 1)

      // If there are remaining items, select the previous item
      // (or the first item if removing first element)
      if (facetsList.value.length > 0) {
        const newIndex = index > 0 ? index - 1 : 0
        await selectFacetByIndex(newIndex)
      } else {
        // If no items left, clear the query
        currentQuery.value = ''
      }
    } else {
      // If removing an unselected item, just remove it
      facetsList.value.splice(index, 1)
    }
  }

  const selectedFacetIndex = computed(
    () => facetsList.value.findIndex(
      (item) => item.query === currentQuery.value))

  async function selectFacetByIndex (index) {
    const query = facetsList.value[index].query
    await executeQuery(query)
  }

  function maybeResourceLabel (url) {
    if (url.startsWith('http://data.europa.eu/a4g/resource/')) {
      const parts = url.split('_')
      return 'Resource: ' + parts.slice(-2).join('_')
    }
    return url
  }

  function shrink (term) {
    for (const [prefix, namespace] of Object.entries({ ...ns })) {
      const startURL = namespace().value
      if (term.value.startsWith(startURL)) {
        return `${prefix}:${value.replaceAll(startURL, '')}`
      }
    }
  }

  function termLabel (term) {
    if (term.value.startsWith('http://data.europa.eu/a4g/resource/')) {
      const parts = term.value.split('_')
      return 'Resource: ' + parts.slice(-2).join('_')
    }
    return shrink(term)
  }

  async function searchFacet (facet) {
    const { type, value, query, term } = facet
    if (type === 'query') {
      const label = 'Query'
      addFacetToList({ ...facet, label, query })
      await executeQuery(value)
    } else if (type === 'notice-number') {
      const query = getNoticeByPublicationNumber(value)
      const label = `Notice ${value}`
      addFacetToList({ ...facet, label, query })
      await executeQuery(query)
    } else if (type === 'named-node') {
      const label = termLabel(term)
      const query = describeWithPragma(term)
      addFacetToList({ ...facet, label, query })
      await executeQuery(query)
    }
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
