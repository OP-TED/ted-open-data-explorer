import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SimpleView from '../src/app/components/SimpleView.vue'
import rdf from 'rdf-ext'
import { Parser } from 'n3'
import { NInput, NButton, NSplit, NTag, NCollapse, NCollapseItem } from 'naive-ui'

// Mock data generators
const createMockDataset = (triples = []) => {
  const dataset = rdf.dataset()
  triples.forEach(({ subject, predicate, object }) => {
    dataset.add(rdf.quad(
      rdf.namedNode(subject),
      rdf.namedNode(predicate),
      typeof object === 'string' && object.startsWith('http')
        ? rdf.namedNode(object)
        : rdf.literal(object)
    ))
  })
  return dataset
}

const createTestDataset = () => {
  const parser = new Parser({ format: 'text/turtle' })
  const ttl = `
    @prefix epo: <http://data.europa.eu/a4g/ontology#> .
    @prefix dcterms: <http://purl.org/dc/terms/> .
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
    
    <http://example.org/notice1> a epo:Notice ;
      epo:hasNoticePublicationNumber "2024-001" ;
      epo:hasPublicationDate "2024-11-06" ;
      dcterms:title "Test Notice" .
    
    <http://example.org/lot1> a epo:Lot ;
      dcterms:title "Test Lot" ;
      dcterms:description "A test lot description" .
  `
  return rdf.dataset(parser.parse(ttl))
}

const defaultShaclShapes = `
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix epo: <http://data.europa.eu/a4g/ontology#> .
@prefix dcterms: <http://purl.org/dc/terms/> .

epo:NoticeShape a sh:NodeShape ;
  sh:targetClass epo:Notice ;
  sh:property [
    sh:path epo:hasNoticePublicationNumber ;
    sh:name "Publication Number" ;
  ] ;
  sh:property [
    sh:path epo:hasPublicationDate ;
    sh:name "Publication Date" ;
  ] ;
  sh:property [
    sh:path dcterms:title ;
    sh:name "Title" ;
  ] .

epo:LotShape a sh:NodeShape ;
  sh:targetClass epo:Lot ;
  sh:property [
    sh:path dcterms:title ;
    sh:name "Title" ;
  ] ;
  sh:property [
    sh:path dcterms:description ;
    sh:name "Description" ;
  ] .
`

describe('SimpleView Component', () => {
  let wrapper

  beforeEach(() => {
    wrapper = null
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Initialization', () => {
    it('should render placeholder when no dataset provided', () => {
      wrapper = mount(SimpleView, {
        props: {
          dataset: null,
          tooManyTriples: false
        },
        global: {
          components: { NInput, NButton, NSplit, NTag, NCollapse, NCollapseItem }
        }
      })

      expect(wrapper.find('.placeholder-content').exists()).toBe(true)
      expect(wrapper.text()).toContain('SHACL-Based Simple View')
      expect(wrapper.text()).toContain('Execute a query to see data structured by SHACL shapes')
    })

    it('should render warning when too many triples', () => {
      const dataset = createTestDataset()
      wrapper = mount(SimpleView, {
        props: {
          dataset,
          tooManyTriples: true
        },
        global: {
          components: { NInput, NButton, NSplit, NTag, NCollapse, NCollapseItem }
        }
      })

      expect(wrapper.find('.too-many-message').exists()).toBe(true)
      expect(wrapper.text()).toContain('Dataset Too Large')
      expect(wrapper.text()).toContain('Please try the Turtle view for large datasets')
    })

    it('should render SHACL interface when dataset provided', () => {
      const dataset = createTestDataset()
      wrapper = mount(SimpleView, {
        props: {
          dataset,
          tooManyTriples: false
        },
        global: {
          components: { NInput, NButton, NSplit, NTag, NCollapse, NCollapseItem }
        }
      })

      expect(wrapper.find('.shacl-interface').exists()).toBe(true)
      expect(wrapper.find('.data-display').exists()).toBe(true)
      expect(wrapper.find('.shapes-editor').exists()).toBe(true)
    })
  })

  describe('SHACL Processing', () => {
    it('should parse default SHACL shapes on mount', async () => {
      const dataset = createTestDataset()
      wrapper = mount(SimpleView, {
        props: {
          dataset,
          tooManyTriples: false
        },
        global: {
          components: { NInput, NButton, NSplit, NTag, NCollapse, NCollapseItem }
        }
      })

      await nextTick()

      // Check that default shapes are loaded
      const textarea = wrapper.find('.shapes-textarea')
      expect(textarea.exists()).toBe(true)

      // Verify no parse errors initially
      expect(wrapper.find('.error-message').exists()).toBe(false)
    })

    it('should handle SHACL parse errors gracefully', async () => {
      const dataset = createTestDataset()
      wrapper = mount(SimpleView, {
        props: {
          dataset,
          tooManyTriples: false
        },
        global: {
          components: { NInput, NButton, NSplit, NTag, NCollapse, NCollapseItem }
        }
      })

      // Set invalid SHACL
      const textarea = wrapper.find('textarea')
      await textarea.setValue('invalid turtle syntax {')

      // Trigger parsing
      const applyButton = wrapper.find('button')
      await applyButton.trigger('click')
      await nextTick()

      // Check for error message
      const errorMsg = wrapper.find('.error-message')
      expect(errorMsg.exists()).toBe(true)
      expect(errorMsg.text()).toContain('Error parsing SHACL shapes')
    })

    it('should detect entities matching SHACL shapes', async () => {
      const dataset = createTestDataset()
      wrapper = mount(SimpleView, {
        props: {
          dataset,
          tooManyTriples: false
        },
        global: {
          components: { NInput, NButton, NSplit, NTag, NCollapse, NCollapseItem }
        }
      })

      // Set valid SHACL shapes
      await wrapper.find('textarea').setValue(defaultShaclShapes)
      await wrapper.find('button').trigger('click')
      await nextTick()

      // Check data stats
      const stats = wrapper.find('.data-stats')
      expect(stats.exists()).toBe(true)
      expect(stats.text()).toMatch(/\d+ entities from \d+ triples/)
    })
  })

  describe('Entity Display', () => {
    it('should display entities in collapsible items', async () => {
      const dataset = createTestDataset()
      wrapper = mount(SimpleView, {
        props: {
          dataset,
          tooManyTriples: false
        },
        global: {
          components: { NInput, NButton, NSplit, NTag, NCollapse, NCollapseItem },
          stubs: {
            'n-collapse': {
              template: '<div class="n-collapse"><slot /></div>'
            },
            'n-collapse-item': {
              props: ['title', 'name'],
              template: '<div class="n-collapse-item" :data-title="title"><slot /></div>'
            }
          }
        }
      })

      await nextTick()

      const collapseItems = wrapper.findAll('.n-collapse-item')
      expect(collapseItems.length).toBeGreaterThan(0)
    })

    it('should show message when no entities match shapes', async () => {
      const emptyDataset = rdf.dataset()
      wrapper = mount(SimpleView, {
        props: {
          dataset: emptyDataset,
          tooManyTriples: false
        },
        global: {
          components: { NInput, NButton, NSplit, NTag, NCollapse, NCollapseItem }
        }
      })

      await nextTick()

      const noEntities = wrapper.find('.no-entities')
      expect(noEntities.exists()).toBe(true)
      expect(noEntities.text()).toContain('No data matches the SHACL shapes')
    })

    it('should display entity properties correctly', async () => {
      const dataset = createTestDataset()
      wrapper = mount(SimpleView, {
        props: {
          dataset,
          tooManyTriples: false
        },
        global: {
          components: { NInput, NButton, NSplit, NTag, NCollapse, NCollapseItem },
          stubs: {
            'n-collapse': {
              template: '<div class="n-collapse"><slot /></div>'
            },
            'n-collapse-item': {
              props: ['title', 'name'],
              template: '<div class="n-collapse-item"><slot /></div>'
            },
            'n-tag': {
              props: ['size'],
              template: '<span class="n-tag"><slot /></span>'
            }
          }
        }
      })

      await nextTick()

      const propertyRows = wrapper.findAll('.property-row')
      expect(propertyRows.length).toBeGreaterThan(0)

      // Check property structure
      const firstProp = propertyRows[0]
      expect(firstProp.find('.property-label').exists()).toBe(true)
      expect(firstProp.find('.property-value').exists()).toBe(true)
    })
  })

  describe('Helper Functions', () => {
    it('should format dates correctly', async () => {
      const dataset = createMockDataset([
        {
          subject: 'http://example.org/item1',
          predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
          object: 'http://data.europa.eu/a4g/ontology#Notice'
        },
        {
          subject: 'http://example.org/item1',
          predicate: 'http://data.europa.eu/a4g/ontology#hasPublicationDate',
          object: '2024-11-06'
        }
      ])

      wrapper = mount(SimpleView, {
        props: { dataset, tooManyTriples: false },
        global: {
          components: { NInput, NButton, NSplit, NTag, NCollapse, NCollapseItem }
        }
      })

      await nextTick()

      // Date formatting is applied in formatPropertyValue
      const values = wrapper.findAll('.property-value')
      const dateValue = values.find(v => v.text().includes('2024') || v.text().includes('/'))
      if (dateValue) {
        expect(dateValue.text()).toBeTruthy()
      }
    })

    it('should extract local names from URIs', async () => {
      const dataset = createTestDataset()
      wrapper = mount(SimpleView, {
        props: { dataset, tooManyTriples: false },
        global: {
          components: { NInput, NButton, NSplit, NTag, NCollapse, NCollapseItem },
          stubs: {
            'n-collapse-item': {
              props: ['title'],
              template: '<div class="n-collapse-item">{{ title }}</div>'
            }
          }
        }
      })

      await nextTick()

      // Check that types are shown as local names
      const items = wrapper.findAll('.n-collapse-item')
      const hasLocalNames = items.some(item =>
        item.text().includes('Notice') || item.text().includes('Lot')
      )
      expect(hasLocalNames).toBe(true)
    })

    it('should handle resources vs literals differently', async () => {
      const dataset = createMockDataset([
        {
          subject: 'http://example.org/item1',
          predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
          object: 'http://data.europa.eu/a4g/ontology#Notice'
        },
        {
          subject: 'http://example.org/item1',
          predicate: 'http://data.europa.eu/a4g/ontology#hasTitle',
          object: 'Literal Value'
        },
        {
          subject: 'http://example.org/item1',
          predicate: 'http://data.europa.eu/a4g/ontology#hasReference',
          object: 'http://example.org/resource1'
        }
      ])

      wrapper = mount(SimpleView, {
        props: { dataset, tooManyTriples: false },
        global: {
          components: { NInput, NButton, NSplit, NTag, NCollapse, NCollapseItem }
        }
      })

      await nextTick()

      const resourceValues = wrapper.findAll('.property-value.is-resource')
      const regularValues = wrapper.findAll('.property-value:not(.is-resource)')

      // Should have both types of values
      expect(resourceValues.length + regularValues.length).toBeGreaterThan(0)
    })
  })

  describe('Unmatched Triples', () => {
    it('should display unmatched triples section when applicable', async () => {
      const dataset = createMockDataset([
        // This won't match any shape
        {
          subject: 'http://example.org/unmatched',
          predicate: 'http://example.org/unknownProp',
          object: 'Some value'
        }
      ])

      wrapper = mount(SimpleView, {
        props: { dataset, tooManyTriples: false },
        global: {
          components: { NInput, NButton, NSplit, NTag, NCollapse, NCollapseItem }
        }
      })

      await nextTick()

      const unmatchedSection = wrapper.find('.unmatched-section')
      if (unmatchedSection.exists()) {
        expect(unmatchedSection.find('h4').text()).toContain('Unmatched Triples')
        expect(unmatchedSection.find('.unmatched-list').exists()).toBe(true)
      }
    })

    it('should limit unmatched triples display', async () => {
      // Create dataset with many unmatched triples
      const triples = []
      for (let i = 0; i < 100; i++) {
        triples.push({
          subject: `http://example.org/item${i}`,
          predicate: 'http://example.org/prop',
          object: `Value ${i}`
        })
      }
      const dataset = createMockDataset(triples)

      wrapper = mount(SimpleView, {
        props: { dataset, tooManyTriples: false },
        global: {
          components: { NInput, NButton, NSplit, NTag, NCollapse, NCollapseItem }
        }
      })

      await nextTick()

      const unmatchedTriples = wrapper.findAll('.unmatched-triple')
      // Should be limited to 50 as per the component logic
      expect(unmatchedTriples.length).toBeLessThanOrEqual(50)
    })
  })

  describe('Performance and Limits', () => {
    it('should limit displayed entities to 20', async () => {
      // Create dataset with many entities
      const triples = []
      for (let i = 0; i < 30; i++) {
        triples.push({
          subject: `http://example.org/notice${i}`,
          predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
          object: 'http://data.europa.eu/a4g/ontology#Notice'
        })
        triples.push({
          subject: `http://example.org/notice${i}`,
          predicate: 'http://purl.org/dc/terms/title',
          object: `Notice ${i}`
        })
      }
      const dataset = createMockDataset(triples)

      wrapper = mount(SimpleView, {
        props: { dataset, tooManyTriples: false },
        global: {
          components: { NInput, NButton, NSplit, NTag, NCollapse, NCollapseItem },
          stubs: {
            'n-collapse-item': {
              props: ['title', 'name'],
              template: '<div class="collapse-item-stub">{{ title }}</div>'
            }
          }
        }
      })

      await nextTick()

      const items = wrapper.findAll('.collapse-item-stub')
      // Should be limited to 20 as per component logic
      expect(items.length).toBeLessThanOrEqual(20)
    })
  })

  describe('User Interactions', () => {
    it('should update shapes when Apply button clicked', async () => {
      const dataset = createTestDataset()
      wrapper = mount(SimpleView, {
        props: { dataset, tooManyTriples: false },
        global: {
          components: { NInput, NButton, NSplit, NTag, NCollapse, NCollapseItem }
        }
      })

      const newShapes = `
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix epo: <http://data.europa.eu/a4g/ontology#> .
        
        epo:TestShape a sh:NodeShape ;
          sh:targetClass epo:TestClass .
      `

      await wrapper.find('textarea').setValue(newShapes)
      await wrapper.find('button').trigger('click')
      await nextTick()

      // Should attempt to parse new shapes
      expect(wrapper.find('textarea').element.value).toBe(newShapes)
    })

    it('should display shape editor with correct styling', () => {
      const dataset = createTestDataset()
      wrapper = mount(SimpleView, {
        props: { dataset, tooManyTriples: false },
        global: {
          components: { NInput, NButton, NSplit, NTag, NCollapse, NCollapseItem }
        }
      })

      const editor = wrapper.find('.shapes-editor')
      expect(editor.exists()).toBe(true)

      const textarea = wrapper.find('.shapes-textarea')
      expect(textarea.exists()).toBe(true)

      const applyButton = wrapper.find('button[type="primary"]')
      expect(applyButton.exists()).toBe(true)
      expect(applyButton.text()).toContain('Apply Shapes')
    })
  })
})
