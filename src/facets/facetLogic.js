export const facetEquals = (queryExtractor) => (a, b) => {
  const safeExtract = (facet) => {
    try { return queryExtractor(facet); } catch { return Symbol('invalid'); }
  };
  return safeExtract(a) === safeExtract(b);
};

export const addUnique = (facets, newFacet, equals) => {
  const existingIndex = facets.findIndex(facet => equals(facet, newFacet));
  return existingIndex >= 0 
    ? { facets, index: existingIndex }
    : { facets: [...facets, newFacet], index: facets.length };
};

export const removeAt = (facets, index) => 
  facets.filter((_, i) => i !== index);

export const adjustIndex = (currentIndex, removedIndex, newLength) => {
  if (currentIndex === removedIndex) {
    return newLength === 0 ? null : Math.max(0, removedIndex - 1);
  }
  return removedIndex < currentIndex ? currentIndex - 1 : currentIndex;
};

export const shouldClearResults = (currentIndex, removedIndex, newLength) =>
  currentIndex === removedIndex && newLength === 0;

export const shouldSelectFacet = (currentIndex, removedIndex, newLength) =>
  currentIndex === removedIndex && newLength > 0;