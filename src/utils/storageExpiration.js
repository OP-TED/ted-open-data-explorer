const SESSION_KEY = 'app-session-id'
const STORAGE_KEY = 'facets-v3'

/**
 * Get or create a unique session ID for the current browser session
 * This ID persists only for the current browser session (tab/window)
 * @returns {string} - The current session ID
 */
function getSessionId() {
  let sessionId = sessionStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = Date.now() + '-' + Math.random().toString(36).substring(2, 9)
    sessionStorage.setItem(SESSION_KEY, sessionId)
  }
  return sessionId
}

/**
 * Initialize storage by cleaning up data from previous sessions
 * This must be called BEFORE useStorage is used
 */
export function initializeStorage() {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY)
    if (storedData) {
      const facets = JSON.parse(storedData)
      if (Array.isArray(facets)) {
        const cleanedFacets = removeExpiredFacets(facets)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedFacets))
      }
    }
  } catch (error) {
    console.error('Error initializing storage:', error)
  }
}

/**
 * Check if a facet belongs to the current browser session
 * @param {Object} facet - The facet object to check
 * @returns {boolean} - True if from different session (expired), false if from current session
 */
export function isExpired(facet) {
  if (!facet.sessionId) return true // No session ID = old data, treat as expired
  return facet.sessionId !== getSessionId()
}

/**
 * Add session metadata to a facet
 * @param {Object} facet - The facet object to add session info to
 * @returns {Object} - Facet with sessionId and timestamp fields
 */
export function addExpirationToFacet(facet) {
  const now = Date.now()
  return {
    ...facet,
    sessionId: getSessionId(),
    timestamp: now
  }
}

/**
 * Filter out facets from previous sessions
 * @param {Array} facets - Array of facet objects
 * @returns {Array} - Array with facets from other sessions removed
 */
export function removeExpiredFacets(facets) {
  return facets.filter(facet => !isExpired(facet))
}
