import { ns } from '../namespaces.js'
import getNoticeByPublicationNumber
  from './getNoticeByPublicationNumber.js'
import { describeWithPragma } from './getTermDescriptionQuery.js'

function shrink (termStr) {
  for (const [prefix, namespace] of Object.entries({ ...ns })) {
    const namespaceStr = namespace().value
    if (termStr.startsWith(namespaceStr)) {
      return `${prefix}:${termStr.replaceAll(namespaceStr, '')}`
    }
  }
  return termStr
}

function termLabel (termStr) {
  if (termStr.startsWith('http://data.europa.eu/a4g/resource/')) {
    const parts = termStr.split('_')
    return 'Resource: ' + parts.slice(-2).join('_')
  }
  return shrink(termStr)
}

function getLabel (facet) {
  const { type, value, query, term } = facet
  if (type === 'query') {
    return 'Query'
  } else if (type === 'notice-number') {
    return `Notice ${value}`
  } else if (type === 'named-node') {
    return termLabel(term.value)
  }
}

function getQuery (facet) {
  const { type, value, query, term } = facet
  if (type === 'query') {
    return query
  } else if (type === 'notice-number') {
    return getNoticeByPublicationNumber(value)
  } else if (type === 'named-node') {
    return describeWithPragma(term)
  }
}

export { getLabel, getQuery }
