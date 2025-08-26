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
    {},
  ],
};

export const useSelectionController = defineStore("notice", () => {
  // Composables
  const { getShareableUrl: generateShareableUrl, initFromUrlParams: initFromUrl } = useUrlFacetParams();
  const { isLoading, error, results, executeQuery, clearResults } = useFacetQuery();
  
  // Store-specific state
  const facetsList = useStorage("facets-v2", []);
  const currentFacetIndex = ref(null);

  const currentFacet = computed(
    () => facetsList.value[currentFacetIndex.value] || null,
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

  watch(currentFacet, async (newVal) => {
    const newQuery = getQuery(newVal);
    await executeQuery(newQuery);
  });

  return {
    facetsList,
    currentFacet,
    currentFacetIndex,
    isLoading,
    error,
    results,
    removeFacet,
    selectFacet,
    getShareableUrl,
    initFromUrlParams,
  };
});

// Export defaultOptions for use in Navigator
export { defaultOptions };
