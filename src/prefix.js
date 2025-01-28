import { ns } from './namespaces.js'

const allPrefixes = { ...ns }

const hasPrefix = (name) => name ? name.split(':').length === 2 : false

const getPrefix = (name) => hasPrefix(name) ? name.split(':')[0] : undefined

const stripPrefix = (str) => str.split(':').slice(1).join(':') || str

function toTerm (value) {
  if (!hasPrefix(value)) {
    throw Error(`${value} has no prefix`)
  }
  const prefix = getPrefix(value)
  if (!allPrefixes[prefix]) {
    throw Error(`${prefix} not known (${value})`)
  }
  return allPrefixes[prefix](stripPrefix(value))
}

export { hasPrefix, getPrefix, stripPrefix, toTerm }
