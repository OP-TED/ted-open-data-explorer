import { defineStore } from 'pinia'
import getNoticeByPublicationNumber
  from '../../queries/getNoticeByPublicationNumber.js'
import {
  describeWithPragma,
} from '../../queries/getTermDescriptionQuery.js'
import { ref } from 'vue'

export const useSelectionController = defineStore('notice', () => {
  const query = ref('')
  const history = ref([])

  const addToHistory = (label, queryStr) => {
    // Check if query already exists in history
    const exists = history.value.some((item) => item.queryStr === queryStr)
    if (!exists) {
      history.value.push({ label, queryStr })
    }
  }

  const selectNoticeByPublicationNumber = (publicationNumber) => {
    const queryStr = getNoticeByPublicationNumber(publicationNumber)
    addToHistory(`Notice ${publicationNumber}`, queryStr)
    query.value = queryStr
  }

  const selectNamed = (term, termLabel) => {
    doTermQuery(describeWithPragma(term), term, termLabel)
  }

  const doTermQuery = (newQuery, term, termLabel) => {
    const label = termLabel.prefix
      ? `${termLabel.prefix}:${termLabel.display}`
      : termLabel.display
    addToHistory(label, newQuery)
    query.value = newQuery
  }

  const removeHistoryItem = (index) => {
    history.value.splice(index, 1)
  }

  return {
    history,
    query,
    selectNoticeByPublicationNumber,
    selectNamed,
    removeHistoryItem,
  }
})
