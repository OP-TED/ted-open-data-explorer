import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { getEntities } from '../../traversers/entities.js'
import { extractEntities } from '../business/extractEntities.js'
import { executeQuery } from '../../services/doQuery.js'
import getNoticeByPublicationNumber
  from '../../queries/getNoticeByPublicationNumber.js'
import { describeWithPragma } from '../../queries/getTermDescriptionQuery.js'
import { ns } from '../../namespaces.js'
import { useStorage } from '@vueuse/core'

const defaultOptions = {
  ignoreNamedGraphs: true,
  matchers: [
    { predicate: ns.rdf.type, object: ns.epo.ChangeInformation },
    { predicate: ns.rdf.type, object: ns.epo.ResultNotice },
    { predicate: ns.rdf.type, object: ns.epo.Notice },
    {},
  ],
}

export const useSelectionController = defineStore('notice', () => {
  const query = ref('')
  const history = useStorage('history-v1', [])
  const error = ref(null)
  const isLoading = ref(false)
  const results = ref(false)

  const executeCurrentQuery = async () => {
    try {
      isLoading.value = true
      results.value = undefined
      error.value = null

      const dataset = await executeQuery(query.value)

      const entities = getEntities(dataset, defaultOptions)

      const extracted = extractEntities({ dataset })
      const stats = {
        triples: dataset.size,
      }
      results.value = {
        entities,
        extracted,
        stats,
      }
    } catch (e) {
      error.value = e
    } finally {
      isLoading.value = false
    }
  }

  const setQuery = (queryStr) => {
    query.value = queryStr
  }
  const addToHistory = (label, queryStr) => {
    const exists = history.value.some((item) => item.queryStr === queryStr)
    if (!exists) {
      history.value.push({ label, queryStr })
    }
  }
  const selectHistoryItem = (index) => {
    query.value = history.value[index].queryStr
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
        query.value = history.value[newIndex].queryStr
      } else {
        // If no items left, clear the query
        query.value = ''
      }
    } else {
      // If removing an unselected item, just remove it
      history.value.splice(index, 1)
    }
  }

  const selectNoticeByPublicationNumber = (publicationNumber) => {
    const queryStr = getNoticeByPublicationNumber(publicationNumber)
    addToHistory(`Notice ${publicationNumber}`, queryStr)
    setQuery(queryStr)
  }

  function maybeResourceLabel (url) {
    if (url.startsWith('http://data.europa.eu/a4g/resource/')) {
      const parts = url.split('_')
      return 'Resource: ' + parts.slice(-2).join('_')
    }
    return url
  }

  const selectNamed = async (term, termLabel) => {
    const query = describeWithPragma(term)
    const label = termLabel.prefix
      ? `${termLabel.prefix}:${termLabel.display}`
      : termLabel.display
    addToHistory(maybeResourceLabel(label), query)
    setQuery(query)
  }

  // Watch for query changes and execute
  watch(query, (newQuery) => {
    if (newQuery) {
      executeCurrentQuery()
    }
  })

  const selectedHistoryIndex = computed(() =>
    history.value.findIndex((item) => item.queryStr === query.value),
  )

  return {
    query,
    error,
    isLoading,
    results,
    setQuery,
    selectNoticeByPublicationNumber,
    selectNamed,
    selectedHistoryIndex,
    history,
    selectHistoryItem,
    removeHistoryItem,
  }
})
