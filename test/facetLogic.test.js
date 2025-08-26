import { expect } from 'chai';
import {
  facetEquals,
  addUnique,
  removeAt,
  adjustIndex,
  shouldClearResults,
  shouldSelectFacet
} from '../src/facets/facetLogic.js';

const mockQueryExtractor = (facet) => {
  if (facet.type === 'query') return facet.query;
  if (facet.type === 'notice-number') return `notice:${facet.value}`;
  throw new Error('Unknown facet type');
};

describe('Facet Logic - Pure Functions', () => {
  describe('facetEquals', () => {
    it('should create equality function for identical facets', () => {
      const equals = facetEquals(mockQueryExtractor);
      const facet1 = { type: 'query', query: 'SELECT * WHERE { ?s ?p ?o }' };
      const facet2 = { type: 'query', query: 'SELECT * WHERE { ?s ?p ?o }' };
      
      expect(equals(facet1, facet2)).to.be.true;
    });

    it('should return false for different facets', () => {
      const equals = facetEquals(mockQueryExtractor);
      const facet1 = { type: 'query', query: 'SELECT * WHERE { ?s ?p ?o }' };
      const facet2 = { type: 'query', query: 'SELECT ?s WHERE { ?s a ?type }' };
      
      expect(equals(facet1, facet2)).to.be.false;
    });

    it('should handle extraction errors gracefully', () => {
      const equals = facetEquals(mockQueryExtractor);
      const validFacet = { type: 'query', query: 'SELECT * WHERE { ?s ?p ?o }' };
      const invalidFacet = { invalid: 'facet' };
      
      expect(equals(validFacet, invalidFacet)).to.be.false;
      expect(equals(invalidFacet, invalidFacet)).to.be.false;
    });
  });

  describe('addUnique', () => {
    it('should add new facet when not exists', () => {
      const facets = [
        { type: 'query', query: 'SELECT * WHERE { ?s ?p ?o }' }
      ];
      const newFacet = { type: 'notice-number', value: '123-2024' };
      const equals = facetEquals(mockQueryExtractor);
      
      const result = addUnique(facets, newFacet, equals);
      
      expect(result.facets).to.have.length(2);
      expect(result.facets[1]).to.deep.equal(newFacet);
      expect(result.index).to.equal(1);
    });

    it('should return existing index when facet exists', () => {
      const facets = [
        { type: 'query', query: 'SELECT * WHERE { ?s ?p ?o }' },
        { type: 'notice-number', value: '123-2024' }
      ];
      const existingFacet = { type: 'query', query: 'SELECT * WHERE { ?s ?p ?o }' };
      const equals = facetEquals(mockQueryExtractor);
      
      const result = addUnique(facets, existingFacet, equals);
      
      expect(result.facets).to.have.length(2);
      expect(result.index).to.equal(0);
    });

    it('should not mutate original array', () => {
      const originalFacets = [{ type: 'query', query: 'SELECT * WHERE { ?s ?p ?o }' }];
      const newFacet = { type: 'notice-number', value: '123-2024' };
      const equals = facetEquals(mockQueryExtractor);
      
      const result = addUnique(originalFacets, newFacet, equals);
      
      expect(originalFacets).to.have.length(1);
      expect(result.facets).to.not.equal(originalFacets);
    });
  });

  describe('removeAt', () => {
    it('should remove facet at specified index', () => {
      const facets = ['facet0', 'facet1', 'facet2'];
      
      const result = removeAt(facets, 1);
      
      expect(result).to.deep.equal(['facet0', 'facet2']);
    });

    it('should not mutate original array', () => {
      const originalFacets = ['facet0', 'facet1', 'facet2'];
      
      const result = removeAt(originalFacets, 1);
      
      expect(originalFacets).to.have.length(3);
      expect(result).to.not.equal(originalFacets);
    });

    it('should handle edge cases', () => {
      expect(removeAt(['only'], 0)).to.deep.equal([]);
      expect(removeAt(['first', 'second'], 0)).to.deep.equal(['second']);
      expect(removeAt(['first', 'second'], 1)).to.deep.equal(['first']);
    });
  });

  describe('adjustIndex', () => {
    it('should adjust index when removing before current', () => {
      expect(adjustIndex(2, 0, 2)).to.equal(1);
      expect(adjustIndex(3, 1, 3)).to.equal(2);
    });

    it('should not adjust when removing after current', () => {
      expect(adjustIndex(1, 2, 2)).to.equal(1);
      expect(adjustIndex(0, 1, 1)).to.equal(0);
    });

    it('should select previous when removing current', () => {
      expect(adjustIndex(2, 2, 2)).to.equal(1);
      expect(adjustIndex(1, 1, 2)).to.equal(0);
      expect(adjustIndex(0, 0, 1)).to.equal(0);
    });

    it('should return null when removing last facet', () => {
      expect(adjustIndex(0, 0, 0)).to.be.null;
    });

    it('should handle null current index', () => {
      expect(adjustIndex(null, 0, 2)).to.be.null;
    });
  });

  describe('shouldClearResults', () => {
    it('should clear when removing selected facet and no facets left', () => {
      expect(shouldClearResults(0, 0, 0)).to.be.true;
      expect(shouldClearResults(1, 1, 0)).to.be.true;
    });

    it('should not clear when removing non-selected facet', () => {
      expect(shouldClearResults(1, 0, 1)).to.be.false;
      expect(shouldClearResults(0, 1, 1)).to.be.false;
    });

    it('should not clear when facets remain', () => {
      expect(shouldClearResults(0, 0, 1)).to.be.false;
      expect(shouldClearResults(1, 1, 2)).to.be.false;
    });
  });

  describe('shouldSelectFacet', () => {
    it('should select when removing selected facet and facets remain', () => {
      expect(shouldSelectFacet(0, 0, 1)).to.be.true;
      expect(shouldSelectFacet(2, 2, 2)).to.be.true;
    });

    it('should not select when removing non-selected facet', () => {
      expect(shouldSelectFacet(1, 0, 2)).to.be.false;
      expect(shouldSelectFacet(0, 1, 2)).to.be.false;
    });

    it('should not select when no facets remain', () => {
      expect(shouldSelectFacet(0, 0, 0)).to.be.false;
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete add-remove-adjust workflow', () => {
      const facets = [];
      const equals = facetEquals(mockQueryExtractor);
      
      const facet1 = { type: 'query', query: 'SELECT ?s WHERE { ?s ?p ?o1 }' };
      const facet2 = { type: 'query', query: 'SELECT ?s WHERE { ?s ?p ?o2 }' };
      const facet3 = { type: 'query', query: 'SELECT ?s WHERE { ?s ?p ?o3 }' };
      
      let { facets: step1, index: index1 } = addUnique(facets, facet1, equals);
      let { facets: step2, index: index2 } = addUnique(step1, facet2, equals);
      let { facets: step3, index: index3 } = addUnique(step2, facet3, equals);
      
      expect(step3).to.have.length(3);
      expect(index1).to.equal(0);
      expect(index2).to.equal(1);
      expect(index3).to.equal(2);
      
      const afterRemoval = removeAt(step3, 1);
      const newIndex = adjustIndex(2, 1, afterRemoval.length);
      
      expect(afterRemoval).to.have.length(2);
      expect(newIndex).to.equal(1);
    });

    it('should handle performance with large arrays', () => {
      const largeFacetList = Array.from({ length: 1000 }, (_, i) => ({
        type: 'query',
        query: `SELECT * WHERE { ?s ?p ?o${i} }`
      }));

      const target = { type: 'query', query: 'SELECT * WHERE { ?s ?p ?o999 }' };
      const equals = facetEquals(mockQueryExtractor);

      const start = Date.now();
      const result = addUnique(largeFacetList, target, equals);
      const duration = Date.now() - start;

      expect(result.index).to.equal(999);
      expect(duration).to.be.lessThan(50);
    });
  });
});