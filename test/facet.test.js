import { expect } from 'chai'
import { validateFacet, safeParseFacet } from '../src/schemas.js'

describe('Schema Validation', () => {
  describe('QueryFacet', () => {
    it('should validate a valid query facet', () => {
      const validQueryFacet = {
        type: 'query',
        query: 'SELECT * WHERE { ?s ?p ?o }',
        timestamp: Date.now(),
      }

      const result = safeParseFacet(validQueryFacet)
      expect(result.success).to.be.true
      expect(result.data.type).to.equal('query')
      expect(result.data.query).to.equal(validQueryFacet.query)
    })

    it('should fail for query facet without required fields', () => {
      const invalidQueryFacet = {
        type: 'query',
        // missing query field
      }

      const result = safeParseFacet(invalidQueryFacet)
      expect(result.success).to.be.false
    })
  })

  describe('NoticeNumberFacet', () => {
    it('should validate a simple notice number', () => {
      const validNoticeFacet = {
        type: 'notice-number',
        value: '12345-2023',
        timestamp: Date.now(),
      }

      const result = safeParseFacet(validNoticeFacet)
      expect(result.success).to.be.true
      expect(result.data.type).to.equal('notice-number')
      expect(result.data.value).to.equal('00012345-2023')
    })

    it('should pad numbers with leading zeros to 8 digits', () => {
      const testCases = [
        { input: '1-2023', expected: '00000001-2023' },
        { input: '123-2023', expected: '00000123-2023' },
        { input: '12345-2023', expected: '00012345-2023' },
        { input: '12345678-2023', expected: '12345678-2023' },
      ]

      testCases.forEach(({ input, expected }) => {
        const noticeFacet = {
          type: 'notice-number',
          value: input,
          timestamp: Date.now(),
        }

        const result = safeParseFacet(noticeFacet)
        expect(result.success).to.be.true
        expect(result.data.value).to.equal(expected)
      })
    })

    it('should handle whitespace in notice numbers', () => {
      const testCases = [
        { input: ' 12345-2023 ', expected: '00012345-2023' },
        { input: '  123-2023  ', expected: '00000123-2023' },
        { input: '12345-2023  ', expected: '00012345-2023' },
        { input: '  12345-2023', expected: '00012345-2023' },
      ]

      testCases.forEach(({ input, expected }) => {
        const noticeFacet = {
          type: 'notice-number',
          value: input,
          timestamp: Date.now(),
        }

        const result = safeParseFacet(noticeFacet)
        expect(result.success).to.be.true
        expect(result.data.value).to.equal(expected)
      })
    })

    it('should maintain the year part unchanged', () => {
      const testCases = [
        { input: '12345-2020', expected: '00012345-2020' },
        { input: '12345-2021', expected: '00012345-2021' },
        { input: '12345-2022', expected: '00012345-2022' },
        { input: '12345-2023', expected: '00012345-2023' },
      ]

      testCases.forEach(({ input, expected }) => {
        const noticeFacet = {
          type: 'notice-number',
          value: input,
          timestamp: Date.now(),
        }

        const result = safeParseFacet(noticeFacet)
        expect(result.success).to.be.true
        expect(result.data.value).to.equal(expected)
      })
    })

    it('should fail for invalid notice number formats', () => {
      const invalidFormats = [
        '12345', // missing year
        '12345-', // missing year
        '-2023', // missing number
        'abc-2023', // non-numeric
        '12345-202', // incomplete year
        '12345-20234', // year too long
        '123456789-2023', // number too long
      ]

      invalidFormats.forEach(invalidValue => {
        const invalidNoticeFacet = {
          type: 'notice-number',
          value: invalidValue,
          timestamp: Date.now(),
        }

        const result = safeParseFacet(invalidNoticeFacet)
        expect(result.success).to.be.false,
          `Expected "${invalidValue}" to fail validation`
      })
    })

    it('should fail for missing value', () => {
      const invalidNoticeFacet = {
        type: 'notice-number',
        timestamp: Date.now(),
      }

      const result = safeParseFacet(invalidNoticeFacet)
      expect(result.success).to.be.false
    })
  })
  describe('NamedNodeFacet', () => {
    it('should validate a valid named node facet', () => {
      const validNamedNodeFacet = {
        type: 'named-node',
        term: {
          value: 'https://example.com/resource',
        },
        timestamp: Date.now(),
      }

      const result = safeParseFacet(validNamedNodeFacet)
      expect(result.success).to.be.true
      expect(result.data.type).to.equal('named-node')
      expect(result.data.term.value).to.equal('https://example.com/resource')
    })

    it('should fail for invalid URL in named node facet', () => {
      const invalidNamedNodeFacet = {
        type: 'named-node',
        term: {
          value: 'not-a-url',
        },
        timestamp: Date.now(),
      }

      const result = safeParseFacet(invalidNamedNodeFacet)
      expect(result.success).to.be.false
    })
  })

  describe('Common Facet Properties', () => {
    it('should add timestamp if not provided', () => {
      const facetWithoutTimestamp = {
        type: 'query',
        query: 'SELECT * WHERE { ?s ?p ?o }',
      }

      const result = safeParseFacet(facetWithoutTimestamp)
      expect(result.success).to.be.true
      expect(result.data.timestamp).to.be.a('number')
    })

    it('should allow optional label property', () => {
      const facetWithLabel = {
        type: 'query',
        query: 'SELECT * WHERE { ?s ?p ?o }',
        label: 'Test Query',
        timestamp: Date.now(),
      }

      const result = safeParseFacet(facetWithLabel)
      expect(result.success).to.be.true
      expect(result.data.label).to.equal('Test Query')
    })
  })

  describe('Invalid Facets', () => {
    it('should fail for unknown facet type', () => {
      const invalidTypeFacet = {
        type: 'unknown-type',
        value: 'something',
      }

      const result = safeParseFacet(invalidTypeFacet)
      expect(result.success).to.be.false
    })

    it('should fail for missing type', () => {
      const noTypeFacet = {
        value: 'something',
      }

      const result = safeParseFacet(noTypeFacet)
      expect(result.success).to.be.false
    })
  })
})
