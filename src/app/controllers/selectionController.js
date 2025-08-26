import { useStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { getQuery } from "../../facets/facets.js";

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
    const existingIndex = facetsList.value.findIndex(
      (item) => getQuery(item) === getQuery(facet),
    );
    if (existingIndex !== -1) {
      return existingIndex;
    }
    facetsList.value.push(facet);
    return facetsList.value.length - 1;
  }

  async function removeFacet(index) {
    const isSelected = index === currentFacetIndex.value;

    facetsList.value.splice(index, 1);

    if (isSelected) {
      if (facetsList.value.length > 0) {
        const newIndex = Math.max(0, index - 1); // Select previous facet if possible
        await selectFacet(newIndex);
      } else {
        clearResults();
        currentFacetIndex.value = null;
      }
    } else if (index < currentFacetIndex.value) {
      currentFacetIndex.value--;
    }
  }

  async function selectFacet(facetOrIndex) {
    currentFacetIndex.value =
      typeof facetOrIndex === "number" ? facetOrIndex : addFacet(facetOrIndex);
  }

  watch(currentFacet, async (newVal, oldVal) => {
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
