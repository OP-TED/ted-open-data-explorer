import { useUrlSearchParams } from '@vueuse/core'

/**
 * Composable for handling URL parameter serialization/deserialization of facets
 * Extracted from selectionController for better reusability and testability
 */
export function useUrlFacetParams () {
  const urlParams = useUrlSearchParams('history')

  /**
   * Generate a shareable URL with the current facet encoded as a query parameter
   * @param {Object} facet - The facet object to encode in the URL
   * @returns {string|null} The shareable URL or null if no facet provided
   */
  function getShareableUrl (facet) {
    if (!facet) return null

    const url = new URL(window.location.href)
    url.searchParams.set('facet', JSON.stringify(facet))
    return url.toString()
  }

  /**
   * Initialize facet selection from URL parameters
   * @param {Function} selectFacetFn - Callback function to select the facet
   */
  async function initFromUrlParams (selectFacetFn) {
    const facetParam = urlParams.facet
    if (facetParam) {
      try {
        const facet = JSON.parse(facetParam)
        await selectFacetFn(facet)
      } catch (e) {
        console.error('Failed to parse facet from URL', e)
        // Better error propagation - could be handled by caller
        throw new Error(`Invalid facet parameter in URL: ${e.message}`)
      }
    }
  }

  return {
    getShareableUrl,
    initFromUrlParams,
  }
}
