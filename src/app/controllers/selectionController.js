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
  const history = useStorage('facets-v1', [])
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

  const addToHistory = (label, queryStr) => {
    const exists = history.value.some((item) => item.queryStr === queryStr)
    if (!exists) {
      history.value.push({ label, queryStr })
    }
  }

  const removeHistoryItem = (index) => {
    // If removing currently selected item
    if (index === selectedHistoryIndex.value) {
      // Clear current results
      results.value = undefined

      // Remove the item
      history.value.splice(index, 1)

      // If there are remaining items, select the previous item
      // (or the first item if removing first element)
      if (history.value.length > 0) {
        const newIndex = index > 0 ? index - 1 : 0
        currentQuery.value = history.value[newIndex].queryStr
      } else {
        // If no items left, clear the query
        currentQuery.value = ''
      }
    } else {
      // If removing an unselected item, just remove it
      history.value.splice(index, 1)
    }
  }

  function maybeResourceLabel (url) {
    if (url.startsWith('http://data.europa.eu/a4g/resource/')) {
      const parts = url.split('_')
      return 'Resource: ' + parts.slice(-2).join('_')
    }
    return url
  }

  async function selectNamed (term, termLabel) {
    const query = describeWithPragma(term)
    const label = termLabel.prefix
      ? `${termLabel.prefix}:${termLabel.display}`
      : termLabel.display
    addToHistory(maybeResourceLabel(label), query)
    await executeQuery(query)
  }

  async function selectHistoryItem (index) {
    const query = history.value[index].queryStr
    await executeQuery(query)
  }

  async function selectByQuery (query) {
    addToHistory('Query', query)
    await executeQuery(query)
  }

  async function searchFacet (facet) {
    const { type, value } = facet
    if (type === 'query') {
      addToHistory('Query', value)
      await executeQuery(value)
    } else if (type === 'notice-number') {
      const queryStr = getNoticeByPublicationNumber(value)
      addToHistory(`Notice ${value}`, queryStr)
      await executeQuery(queryStr)
    }

  }

  const selectedHistoryIndex = computed(
    () => history.value.findIndex(
      (item) => item.queryStr === currentQuery.value))

  return {
    currentQuery,
    searchFacet,
    error,
    isLoading,
    results,
    selectNamed,
    selectedHistoryIndex,
    history,
    selectHistoryItem,
    removeHistoryItem,
  }
})
