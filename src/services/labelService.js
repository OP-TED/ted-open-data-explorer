import { doSPARQL } from './doQuery.js'
import { ns } from '../namespaces.js'

// Configuration
const BATCH_SIZE = 20
const BATCH_DELAY = 100

// Additional prefixes not in namespaces
const ADDITIONAL_PREFIXES = [
  'http://publications.europa.eu/resource/authority/',
  'http://data.europa.eu/cpv'
]

// State
const labelCache = new Map()
const pendingRequests = new Map() // uri -> callbacks[]
let batchTimer = null

// Combine namespace URIs with additional prefixes
const namespaceUris = Object.entries(ns).map(([_, ns]) => ns().value)
const eligiblePrefixes = [...namespaceUris, ...ADDITIONAL_PREFIXES]

/**
 * Check if URI is eligible for label resolution
 */
function isLabelEligible(uri) {
  if (typeof uri !== 'string') return false
  // Check if URI starts with any eligible prefix
  return eligiblePrefixes.some(prefix => uri.startsWith(prefix))
}

/**
 * Get cached label if available
 */
function getCachedLabel(uri) {
  return isLabelEligible(uri) ? (labelCache.get(uri) ?? null) : null
}

/**
 * Build SPARQL query for batch label resolution
 */
function buildLabelsQuery(uris) {
  const values = uris.map(uri => `<${uri}>`).join(' ')
  return `
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    
    CONSTRUCT {
      ?uri skos:prefLabel ?prefLabel .
      ?uri rdfs:label ?label .
    }
    WHERE {
      VALUES ?uri { ${values} }
      {
        ?uri skos:prefLabel ?prefLabel .
        FILTER (lang(?prefLabel) = "en")
      }
      UNION
      {
        ?uri rdfs:label ?label .
        FILTER (lang(?label) = "en")
      }
      UNION
      {
        # Fallback to labels without language tag
        ?uri rdfs:label ?label .
        FILTER (lang(?label) = "")
      }
    }`
}

/**
 * Parse SPARQL results into a Map
 */
function parseResults(dataset, requestedUris) {
  const results = new Map()
  const prefLabelPredicate = 'http://www.w3.org/2004/02/skos/core#prefLabel'
  const rdfsLabelPredicate = 'http://www.w3.org/2000/01/rdf-schema#label'

  // Initialize all requested URIs with null
  requestedUris.forEach(uri => results.set(uri, null))

  // Collect labels by priority tier
  const labelsByUri = new Map()

  for (const quad of dataset) {
    const uri = quad.subject.value
    const label = quad.object.value
    const lang = quad.object.language || ''

    if (!labelsByUri.has(uri)) {
      labelsByUri.set(uri, {
        skosPrefLabel: null,
        rdfsLabelWithLang: null,
        rdfsLabelNoLang: null,
      })
    }

    const labels = labelsByUri.get(uri)

    if (quad.predicate.value === prefLabelPredicate && lang === 'en') {
      labels.skosPrefLabel = label
    } else if (quad.predicate.value === rdfsLabelPredicate) {
      if (lang === 'en') {
        labels.rdfsLabelWithLang = label
      } else if (lang === '') {
        labels.rdfsLabelNoLang = label
      }
    }
  }

  // Set results with priority: skos:prefLabel > rdfs:label (en) > rdfs:label (no lang)
  for (const uri of requestedUris) {
    const labels = labelsByUri.get(uri)
    if (labels) {
      results.set(uri,
        labels.skosPrefLabel ||
        labels.rdfsLabelWithLang ||
        labels.rdfsLabelNoLang ||
        null
      )
    }
  }

  return results
}

/**
 * Fetch labels for a batch of URIs
 */
async function fetchBatch(uris) {
  try {
    const query = buildLabelsQuery(uris)
    const dataset = await doSPARQL(query)
    return parseResults(dataset, uris)
  } catch (error) {
    console.error('Failed to fetch labels:', error)
    // Return null for all URIs on error
    return new Map(uris.map(uri => [uri, null]))
  }
}

/**
 * Process all pending requests
 */
async function processPending() {
  // Clear timer
  if (batchTimer) {
    clearTimeout(batchTimer)
    batchTimer = null
  }

  // Get all pending URIs
  const uris = Array.from(pendingRequests.keys())
  if (uris.length === 0) return

  // Save callbacks and clear pending map to avoid race conditions
  const callbacks = new Map(pendingRequests)
  pendingRequests.clear()

  // Process in batches
  const batches = []
  for (let i = 0; i < uris.length; i += BATCH_SIZE) {
    batches.push(uris.slice(i, i + BATCH_SIZE))
  }

  // Fetch all batches in parallel
  const results = await Promise.all(batches.map(fetchBatch))

  // Merge all results
  const allResults = results.reduce((merged, batchResult) => {
    batchResult.forEach((value, key) => merged.set(key, value))
    return merged
  }, new Map())

  // Update cache and notify callbacks
  callbacks.forEach((callbackList, uri) => {
    const label = allResults.get(uri) ?? null
    labelCache.set(uri, label)
    callbackList.forEach(callback => callback(label))
  })
}

/**
 * Schedule batch processing
 */
function scheduleBatch() {
  if (batchTimer) {
    clearTimeout(batchTimer)
  }

  // Process immediately if we hit batch size
  if (pendingRequests.size >= BATCH_SIZE) {
    processPending()
  } else {
    // Otherwise wait for more requests
    batchTimer = setTimeout(processPending, BATCH_DELAY)
  }
}

/**
 * Request label with automatic batching (callback-based)
 */
function requestLabel(uri, callback) {
  if (!isLabelEligible(uri)) {
    callback(null)
    return
  }

  // Check cache first
  const cached = labelCache.get(uri)
  if (cached !== undefined) {
    callback(cached)
    return
  }

  // Add to pending batch
  if (!pendingRequests.has(uri)) {
    pendingRequests.set(uri, [])
  }
  pendingRequests.get(uri).push(callback)

  scheduleBatch()
}

/**
 * Promise-based interface for label resolution
 */
function resolveLabel(uri) {
  return new Promise(resolve => requestLabel(uri, resolve))
}

/**
 * Resolve multiple labels at once
 */
async function resolveLabels(uris) {
  const results = await Promise.all(uris.map(resolveLabel))
  return Object.fromEntries(uris.map((uri, i) => [uri, results[i]]))
}

/**
 * Clear all caches and pending requests
 */
function clearLabelCache() {
  labelCache.clear()
  pendingRequests.clear()
  if (batchTimer) {
    clearTimeout(batchTimer)
    batchTimer = null
  }
}

/**
 * Get cache statistics for debugging
 */
function inspectCache() {
  const stats = {
    cacheSize: labelCache.size,
    pendingRequests: pendingRequests.size,
    eligiblePrefixes: eligiblePrefixes.length,
    sampleEntries: labelCache.size > 100
      ? `${labelCache.size} entries (too many to display)`
      : Object.fromEntries(labelCache),
  }
  console.log('Label cache stats:', stats)
  return stats
}

// Export public API
export {
  isLabelEligible,
  getCachedLabel,
  requestLabel,
  resolveLabel,
  resolveLabels,
  clearLabelCache,
  inspectCache
}
