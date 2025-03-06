import { useStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { getQuery } from "../../facets/facets.js";

import { ns } from "../../namespaces.js";
import { doSPARQL } from "../../services/doQuery.js";
import { getEntities } from "../../traversers/entities.js";
import { extractEntities } from "../business/extractEntities.js";
import { useUrlSearchParams } from "@vueuse/core";

const defaultOptions = {
  ignoreNamedGraphs: true,
  matchers: [
    { predicate: ns.rdf.type, object: ns.epo.ChangeInformation },
    { predicate: ns.rdf.type, object: ns.epo.ResultNotice },
    { predicate: ns.rdf.type, object: ns.epo.Notice },
    {},
  ],
};
const urlParams = useUrlSearchParams("history");

export const useSelectionController = defineStore("notice", () => {
  const facetsList = useStorage("facets-v2", []);
  const currentFacetIndex = ref(null);
  const isLoading = ref(false);
  const error = ref(null);
  const results = ref(null);

  const currentFacet = computed(
    () => facetsList.value[currentFacetIndex.value] || null,
  );

  function getShareableUrl() {
    if (!currentFacet.value) return null;

    const url = new URL(window.location.href);
    url.searchParams.set("facet", JSON.stringify(currentFacet.value));
    return url.toString();
  }
  async function initFromUrlParams () {
    const facetParam = urlParams.facet;
    if (facetParam) {
      try {
        const facet = JSON.parse(facetParam);
        await selectFacet(facet);
      } catch (e) {
        console.error("Failed to parse facet from URL", e);
      }
    }
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
        results.value = null;
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

  async function executeQuery(query) {
    try {
      isLoading.value = true;
      error.value = null;
      results.value = null;

      const dataset = await doSPARQL(query);
      results.value = {
        entities: getEntities(dataset, defaultOptions),
        extracted: extractEntities({ dataset }),
        stats: { triples: dataset.size },
      };
    } catch (e) {
      error.value = e;
    } finally {
      isLoading.value = false;
    }
  }

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
