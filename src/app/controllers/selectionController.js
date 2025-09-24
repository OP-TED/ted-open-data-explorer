import { useStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { getQuery } from "../../facets/facets.js";
import {
  facetEquals,
  addUnique,
  removeAt,
  adjustIndex,
  shouldClearResults,
  shouldSelectFacet
} from "../../facets/facetLogic.js";

import { ns } from "../../namespaces.js";
import { useUrlFacetParams } from "../../composables/useUrlFacetParams.js";
import { useFacetQuery } from "../../composables/useFacetQuery.js";

const defaultOptions = {
  ignoreNamedGraphs: true,
  matchers: [

    { predicate: ns.rdf.type, object: ns.epo.ChangeInformation },
    { predicate: ns.rdf.type, object: ns.epo.ResultNotice },
    { predicate: ns.rdf.type, object: ns.epo.Notice },

    { predicate: ns.epo.specifiesProcurementCriterion },

    {},
  ],
};

export const useSelectionController = defineStore("notice", () => {
  // Composables
  const { getShareableUrl: generateShareableUrl, initFromUrlParams: initFromUrl } = useUrlFacetParams();
  const { isLoading, error, results, executeQuery, clearResults } = useFacetQuery();

  // Store-specific state
  const facetsList = useStorage("facets-v2", [
    // Add some test facets for drag and drop testing
    { type: 'contract', value: 'Test Contract 1', timestamp: Date.now() + 1 },
    { type: 'procedure', value: 'Test Procedure 1', timestamp: Date.now() + 2 },
    { type: 'notice', value: 'Test Notice 1', timestamp: Date.now() + 3 },
    { type: 'contract', value: 'Test Contract 2', timestamp: Date.now() + 4 },
    { type: 'named-node', term: { value: 'Test Vertical 1' }, timestamp: Date.now() + 5 },
    { type: 'named-node', term: { value: 'Test Vertical 2' }, timestamp: Date.now() + 6 },
    { type: 'named-node', term: { value: 'Test Vertical 3' }, timestamp: Date.now() + 7 }
  ]);
  const currentFacetIndex = ref(null);

  const currentFacet = computed(
    () => facetsList.value[currentFacetIndex.value] || null,
  );

  // Separate facets by type for different layouts
  const horizontalFacets = computed(() =>
    facetsList.value.filter(facet => facet.type !== 'named-node')
  );

  const verticalFacets = computed(() =>
    facetsList.value.filter(facet => facet.type === 'named-node')
  );

  // Wrap composable functions to use current context
  function getShareableUrl() {
    return generateShareableUrl(currentFacet.value);
  }

  async function initFromUrlParams() {
    await initFromUrl(selectFacet);
  }

  function addFacet(facet) {
    const { facets, index } = addUnique(facetsList.value, facet, facetEquals(getQuery));
    facetsList.value = facets;
    return index;
  }

  async function removeFacet(index) {
    const originalIndex = currentFacetIndex.value;
    const newFacets = removeAt(facetsList.value, index);
    const newIndex = adjustIndex(originalIndex, index, newFacets.length);

    facetsList.value = newFacets;
    currentFacetIndex.value = newIndex;

    if (shouldClearResults(originalIndex, index, newFacets.length)) {
      clearResults();
    } else if (shouldSelectFacet(originalIndex, index, newFacets.length)) {
      await selectFacet(newIndex);
    }
  }

  async function selectFacet(facetOrIndex) {
    currentFacetIndex.value =
      typeof facetOrIndex === "number" ? facetOrIndex : addFacet(facetOrIndex);
  }

  // Helper function to select facet by reference (for filtered views)
  function selectFacetByReference(facet) {
    const index = facetsList.value.indexOf(facet);
    if (index !== -1) {
      currentFacetIndex.value = index;
    }
  }

  watch(currentFacet, async (newVal) => {
    const newQuery = getQuery(newVal);
    await executeQuery(newQuery);
  });



  function reorderFacets(oldIndex, newIndex, facetType) {
    // Get the correct facet list based on type
    const isVertical = facetType === 'vertical';
    const filteredFacets = isVertical
      ? facetsList.value.filter(facet => facet.type === 'named-node')
      : facetsList.value.filter(facet => facet.type !== 'named-node');

    // Get the facet being moved
    const movedFacet = filteredFacets[oldIndex];
    if (!movedFacet) return;

    // Find the original indices in the full facets list
    const originalOldIndex = facetsList.value.indexOf(movedFacet);

    // Remove the facet from its current position
    const newFacetsList = [...facetsList.value];
    newFacetsList.splice(originalOldIndex, 1);

    // Find where to insert it based on the filtered list
    let insertIndex;
    if (newIndex === 0) {
      // Insert at the beginning of the filtered group
      const firstOfType = newFacetsList.findIndex(facet =>
        isVertical ? facet.type === 'named-node' : facet.type !== 'named-node'
      );
      insertIndex = firstOfType === -1 ? newFacetsList.length : firstOfType;
    } else {
      // Find the facet that should be before our insertion point
      const targetFacet = filteredFacets[newIndex - (oldIndex < newIndex ? 0 : 1)];
      const targetIndex = newFacetsList.indexOf(targetFacet);
      insertIndex = targetIndex + 1;
    }

    // Insert the facet at the new position
    newFacetsList.splice(insertIndex, 0, movedFacet);

    // Update the facets list
    facetsList.value = newFacetsList;

    // Update current facet index if needed
    if (currentFacetIndex.value === originalOldIndex) {
      currentFacetIndex.value = insertIndex;
    } else if (currentFacetIndex.value > originalOldIndex && currentFacetIndex.value < insertIndex) {
      currentFacetIndex.value--;
    } else if (currentFacetIndex.value < originalOldIndex && currentFacetIndex.value >= insertIndex) {
      currentFacetIndex.value++;
    }
  }

  return {
    facetsList,
    horizontalFacets,
    verticalFacets,
    currentFacet,
    currentFacetIndex,
    isLoading,
    error,
    results,
    removeFacet,
    selectFacet,
    selectFacetByReference,
    getShareableUrl,
    initFromUrlParams,
    reorderFacets,
  };
});

// Export defaultOptions for use in Navigator
export { defaultOptions };
