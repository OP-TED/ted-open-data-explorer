import { defineStore } from 'pinia'
import { ref, shallowReadonly, watch } from 'vue'
import { getEntities } from '../../traversers/entities.js'
import { extractEntities } from '../business/extractEntities.js'
import { executeQuery } from '../../services/doQuery.js'
import getNoticeByPublicationNumber
  from '../../queries/getNoticeByPublicationNumber.js'
import { describeWithPragma } from '../../queries/getTermDescriptionQuery.js'
import { ns } from '../../namespaces.js'

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
  const history = ref([])
  const error = ref(null)
  const isLoading = ref(false)
  const results = ref(false)
  const currentDataset = shallowReadonly(undefined)

  const executeCurrentQuery = async () => {
    try {
      isLoading.value = true

      error.value = null

      const dataset = await executeQuery(query.value)

      currentDataset.value = dataset
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
    history.value.splice(index, 1)
  }

  const selectNoticeByPublicationNumber = (publicationNumber) => {
    const queryStr = getNoticeByPublicationNumber(publicationNumber)
    addToHistory(`Notice ${publicationNumber}`, queryStr)
    setQuery(queryStr)
  }

  const selectNamed = (term, termLabel) => {
    doTermQuery(describeWithPragma(term), term, termLabel)
  }

  const doTermQuery = (newQuery, term, termLabel) => {
    const label = termLabel.prefix
      ? `${termLabel.prefix}:${termLabel.display}`
      : termLabel.display
    addToHistory(label, newQuery)
    setQuery(newQuery)
  }

  // Watch for query changes and execute
  watch(query, (newQuery) => {
    if (newQuery) {
      executeCurrentQuery()
    }
  })

  return {
    query,
    error,
    isLoading,
    results,
    setQuery,
    selectNoticeByPublicationNumber,
    selectNamed,

    history,
    selectHistoryItem,
    removeHistoryItem,
  }
})
