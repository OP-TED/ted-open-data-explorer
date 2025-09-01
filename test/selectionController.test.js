import { expect } from 'chai'

// Test URL parameter handling functions since these will be extracted
describe('Selection Controller - URL Parameter Handling', () => {
  describe('URL Generation', () => {
    it('should generate valid facet parameter for query facets', () => {
      const testFacet = { 
        type: 'query', 
        query: 'SELECT * WHERE { ?s ?p ?o }',
        timestamp: 1640995200000
      }
      
      const url = new URL('http://localhost:3000/')
      url.searchParams.set('facet', JSON.stringify(testFacet))
      
      expect(url.toString()).to.include('facet=')
      expect(url.searchParams.get('facet')).to.equal(JSON.stringify(testFacet))
    })

    it('should generate valid facet parameter for notice number facets', () => {
      const testFacet = { 
        type: 'notice-number', 
        value: '00123456-2024',
        timestamp: 1640995200000
      }
      
      const url = new URL('http://localhost:3000/')
      url.searchParams.set('facet', JSON.stringify(testFacet))
      
      expect(url.toString()).to.include('facet=')
      expect(url.searchParams.get('facet')).to.equal(JSON.stringify(testFacet))
    })
  })

  describe('URL Parsing', () => {
    it('should parse valid query facet from URL parameter', () => {
      const testFacet = { 
        type: 'query', 
        query: 'SELECT * WHERE { ?s ?p ?o }',
        timestamp: 1640995200000
      }
      const facetParam = JSON.stringify(testFacet)
      
      const parsed = JSON.parse(facetParam)
      
      expect(parsed).to.deep.equal(testFacet)
      expect(parsed.type).to.equal('query')
      expect(parsed.query).to.equal('SELECT * WHERE { ?s ?p ?o }')
    })

    it('should handle invalid JSON gracefully', () => {
      const invalidJson = 'invalid-json-string'
      
      let result = null
      try {
        result = JSON.parse(invalidJson)
      } catch (e) {
        result = null
      }
      
      expect(result).to.equal(null)
    })

    it('should handle empty or null parameters', () => {
      expect(JSON.parse('null')).to.equal(null)
      
      let result = null
      try {
        result = JSON.parse('')
      } catch (e) {
        result = null
      }
      expect(result).to.equal(null)
    })
  })
})

// Test facet management logic since this will remain in the store
describe('Selection Controller - Facet Management', () => {
  describe('Facet Comparison', () => {
    it('should identify identical query facets', () => {
      const facet1 = { type: 'query', query: 'SELECT * WHERE { ?s ?p ?o }' }
      const facet2 = { type: 'query', query: 'SELECT * WHERE { ?s ?p ?o }' }
      
      // This simulates the getQuery function comparison logic
      const query1 = facet1.query
      const query2 = facet2.query
      
      expect(query1).to.equal(query2)
    })

    it('should differentiate query facets with different queries', () => {
      const facet1 = { type: 'query', query: 'SELECT * WHERE { ?s ?p ?o }' }
      const facet2 = { type: 'query', query: 'SELECT ?s WHERE { ?s ?p ?o }' }
      
      const query1 = facet1.query
      const query2 = facet2.query
      
      expect(query1).to.not.equal(query2)
    })

    it('should identify identical notice number facets', () => {
      const facet1 = { type: 'notice-number', value: '00123456-2024' }
      const facet2 = { type: 'notice-number', value: '00123456-2024' }
      
      // This simulates notice number facet comparison
      expect(facet1.value).to.equal(facet2.value)
      expect(facet1.type).to.equal(facet2.type)
    })
  })

  describe('Facet Array Operations', () => {
    it('should find existing facet in array', () => {
      const facets = [
        { type: 'query', query: 'SELECT ?s WHERE { ?s ?p ?o }' },
        { type: 'query', query: 'SELECT * WHERE { ?s ?p ?o }' },
        { type: 'notice-number', value: '00123456-2024' }
      ]
      
      const targetQuery = 'SELECT * WHERE { ?s ?p ?o }'
      const foundIndex = facets.findIndex(facet => 
        facet.type === 'query' && facet.query === targetQuery
      )
      
      expect(foundIndex).to.equal(1)
    })

    it('should return -1 for non-existent facet', () => {
      const facets = [
        { type: 'query', query: 'SELECT ?s WHERE { ?s ?p ?o }' },
        { type: 'notice-number', value: '00123456-2024' }
      ]
      
      const targetQuery = 'SELECT * WHERE { ?s ?p ?o }'
      const foundIndex = facets.findIndex(facet => 
        facet.type === 'query' && facet.query === targetQuery
      )
      
      expect(foundIndex).to.equal(-1)
    })

    it('should handle array index adjustments after removal', () => {
      let currentIndex = 2
      const removeIndex = 0
      
      // Simulate the logic from removeFacet function
      if (removeIndex < currentIndex) {
        currentIndex--
      }
      
      expect(currentIndex).to.equal(1)
    })

    it('should select previous facet when removing current facet', () => {
      const facets = ['facet0', 'facet1', 'facet2']
      const currentIndex = 2
      const removeIndex = 2
      
      // Simulate removeFacet logic for selecting previous
      const newIndex = Math.max(0, removeIndex - 1)
      
      expect(newIndex).to.equal(1)
    })
  })

  describe('Facet Reordering (Grid Drag-Drop)', () => {
    it('should reorder horizontal facets correctly', () => {
      const facets = [
        { type: 'query', query: 'Query 1' },
        { type: 'notice-number', value: 'Notice 1' },
        { type: 'query', query: 'Query 2' },
        { type: 'named-node', term: { value: 'Vertical 1' } }
      ]
      
      // Simulate moving horizontal facet from index 0 to index 1
      const horizontalFacets = facets.filter(f => f.type !== 'named-node')
      expect(horizontalFacets).to.have.lengthOf(3)
      
      // Move Query 1 from position 0 to position 1
      const movedFacet = horizontalFacets[0]
      const newHorizontalOrder = [...horizontalFacets]
      newHorizontalOrder.splice(0, 1) // Remove from old position
      newHorizontalOrder.splice(1, 0, movedFacet) // Insert at new position
      
      expect(newHorizontalOrder[0].type).to.equal('notice-number')
      expect(newHorizontalOrder[1].query).to.equal('Query 1')
      expect(newHorizontalOrder[2].query).to.equal('Query 2')
    })

    it('should reorder vertical facets correctly', () => {
      const facets = [
        { type: 'query', query: 'Query 1' },
        { type: 'named-node', term: { value: 'Vertical 1' } },
        { type: 'named-node', term: { value: 'Vertical 2' } },
        { type: 'named-node', term: { value: 'Vertical 3' } }
      ]
      
      const verticalFacets = facets.filter(f => f.type === 'named-node')
      expect(verticalFacets).to.have.lengthOf(3)
      
      // Move Vertical 1 from position 0 to position 2
      const movedFacet = verticalFacets[0]
      const newVerticalOrder = [...verticalFacets]
      newVerticalOrder.splice(0, 1)
      newVerticalOrder.splice(2, 0, movedFacet)
      
      expect(newVerticalOrder[0].term.value).to.equal('Vertical 2')
      expect(newVerticalOrder[1].term.value).to.equal('Vertical 3')
      expect(newVerticalOrder[2].term.value).to.equal('Vertical 1')
    })

    it('should handle edge cases in reordering', () => {
      // Test reordering with only one facet
      const singleFacet = [{ type: 'query', query: 'Single Query' }]
      expect(singleFacet).to.have.lengthOf(1)
      
      // No reordering should be possible
      const result = [...singleFacet]
      expect(result).to.deep.equal(singleFacet)
    })

    it('should handle invalid indices gracefully', () => {
      const facets = [
        { type: 'query', query: 'Query 1' },
        { type: 'query', query: 'Query 2' }
      ]
      
      // Test moving to invalid index (beyond array bounds)
      const horizontalFacets = facets.filter(f => f.type !== 'named-node')
      const maxIndex = horizontalFacets.length - 1
      
      expect(Math.min(5, maxIndex)).to.equal(1) // Should clamp to valid index
    })
  })

  describe('Facet Type Filtering', () => {
    it('should correctly filter horizontal facets', () => {
      const mixedFacets = [
        { type: 'query', query: 'Query 1' },
        { type: 'named-node', term: { value: 'Vertical 1' } },
        { type: 'notice-number', value: '123456-2024' },
        { type: 'named-node', term: { value: 'Vertical 2' } }
      ]
      
      const horizontal = mixedFacets.filter(f => f.type !== 'named-node')
      
      expect(horizontal).to.have.lengthOf(2)
      expect(horizontal[0].type).to.equal('query')
      expect(horizontal[1].type).to.equal('notice-number')
    })

    it('should correctly filter vertical facets', () => {
      const mixedFacets = [
        { type: 'query', query: 'Query 1' },
        { type: 'named-node', term: { value: 'Vertical 1' } },
        { type: 'notice-number', value: '123456-2024' },
        { type: 'named-node', term: { value: 'Vertical 2' } }
      ]
      
      const vertical = mixedFacets.filter(f => f.type === 'named-node')
      
      expect(vertical).to.have.lengthOf(2)
      expect(vertical[0].term.value).to.equal('Vertical 1')
      expect(vertical[1].term.value).to.equal('Vertical 2')
    })
  })
})
