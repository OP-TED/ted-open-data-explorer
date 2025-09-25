import { ref, computed, watch, onUnmounted, shallowRef } from 'vue'
import {
  requestLabel,
  getCachedLabel,
  isLabelEligible,
} from '../services/labelService.js'

/**
 * Composable for resolving a single label
 */
export function useLabel (initialUri = null) {
  const label = ref(null)
  const isLoading = ref(false)
  let abortCallback = null

  const resolve = (uri) => {
    // Cancel any pending request
    if (abortCallback) {
      abortCallback()
      abortCallback = null
    }

    // Reset state
    label.value = null
    isLoading.value = false

    if (!uri || !isLabelEligible(uri)) {
      return
    }

    // Check cache first
    const cached = getCachedLabel(uri)
    if (cached !== null) {
      label.value = cached
      return
    }

    // Start async resolution
    isLoading.value = true
    let cancelled = false

    abortCallback = () => {
      cancelled = true
      isLoading.value = false
    }

    requestLabel(uri, (resolvedLabel) => {
      if (!cancelled) {
        label.value = resolvedLabel
        isLoading.value = false
        abortCallback = null
      }
    })
  }

  // Resolve initial URI if provided
  if (initialUri) {
    resolve(initialUri)
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (abortCallback) {
      abortCallback()
    }
  })

  return {
    label,
    isLoading,
    resolve,
  }
}

/**
 * Composable for resolving a label from a reactive URI ref
 */
export function useLabelRef (uriRef) {
  const { label, isLoading, resolve } = useLabel()

  // Watch URI changes
  const stopWatch = watch(
    uriRef,
    (newUri) => resolve(newUri),
    { immediate: true },
  )

  onUnmounted(stopWatch)

  return { label, isLoading }
}

/**
 * Composable for resolving multiple labels
 */
export function useLabels (initialUris = []) {
  const labels = ref({})
  const isLoading = ref(false)
  const pendingCount = ref(0)
  let abortCallbacks = new Map()

  const resolve = (uris) => {
    // Cancel all pending requests
    abortCallbacks.forEach(abort => abort())
    abortCallbacks.clear()

    // Reset state
    labels.value = {}
    pendingCount.value = 0
    isLoading.value = false

    if (!uris || uris.length === 0) {
      return
    }

    // Filter eligible URIs
    const eligible = uris.filter(isLabelEligible)
    if (eligible.length === 0) {
      return
    }

    // Track pending requests
    const pending = new Set(eligible)
    pendingCount.value = pending.size
    isLoading.value = true

    eligible.forEach(uri => {
      // Check cache first
      const cached = getCachedLabel(uri)
      if (cached !== null) {
        labels.value[uri] = cached
        pending.delete(uri)
        pendingCount.value = pending.size
        if (pending.size === 0) {
          isLoading.value = false
        }
        return
      }

      // Create abort callback for this URI
      let cancelled = false
      abortCallbacks.set(uri, () => {
        cancelled = true
        pending.delete(uri)
      })

      // Request label
      requestLabel(uri, (resolvedLabel) => {
        if (!cancelled) {
          labels.value[uri] = resolvedLabel
          pending.delete(uri)
          pendingCount.value = pending.size
          abortCallbacks.delete(uri)

          if (pending.size === 0) {
            isLoading.value = false
          }
        }
      })
    })
  }

  // Resolve initial URIs if provided
  if (initialUris.length > 0) {
    resolve(initialUris)
  }

  // Cleanup on unmount
  onUnmounted(() => {
    abortCallbacks.forEach(abort => abort())
    abortCallbacks.clear()
  })

  return {
    labels,
    isLoading,
    pendingCount,
    resolve,
  }
}

/**
 * Composable for resolving labels from a reactive URIs ref
 */
export function useLabelsRef (urisRef) {
  const { labels, isLoading, pendingCount, resolve } = useLabels()

  // Watch URIs changes
  const stopWatch = watch(
    urisRef,
    (newUris) => resolve(newUris),
    { immediate: true, deep: true },
  )

  onUnmounted(stopWatch)

  return { labels, isLoading, pendingCount }
}

/**
 * Helper to get a label by URI from labels object
 */
export function getLabelFromResults (labels, uri) {
  return labels[uri] || null
}

/**
 * Helper to resolve a single label as a promise
 */
export async function resolveLabelAsync (uri) {
  if (!isLabelEligible(uri)) {
    return null
  }

  const cached = getCachedLabel(uri)
  if (cached !== null) {
    return cached
  }

  return new Promise((resolve) => {
    requestLabel(uri, resolve)
  })
}

/**
 * Helper to resolve multiple labels as promises
 */
export async function resolveLabelsAsync (uris) {
  const results = await Promise.all(
    uris.map(uri => resolveLabelAsync(uri)),
  )
  return Object.fromEntries(
    uris.map((uri, i) => [uri, results[i]]),
  )
}
