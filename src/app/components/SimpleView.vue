<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { NInput, NButton, NSplit, NTag, NCollapse, NCollapseItem, NAlert } from 'naive-ui'
import rdf from 'rdf-ext'
import { Parser } from 'n3'

// Props with validation
const props = defineProps({
  dataset: {
    type: Object,
    default: null,
    validator: (value) => value === null || (value && typeof value.match === 'function')
  },
  tooManyTriples: {
    type: Boolean,
    default: false
  }
})

// Constants
const NAMESPACES = {
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  sh: 'http://www.w3.org/ns/shacl#',
  dcterms: 'http://purl.org/dc/terms/',
  epo: 'http://data.europa.eu/a4g/ontology#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  skos: 'http://www.w3.org/2004/02/skos/core#',
  xsd: 'http://www.w3.org/2001/XMLSchema#'
}

const DEFAULT_SHACL_TTL = `
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix epo: <http://data.europa.eu/a4g/ontology#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

epo:AccessTermShape a sh:NodeShape ;
  sh:targetClass epo:AccessTerm ;
  sh:property [
    sh:path epo:hasPublicAccessURL ;
    sh:name "Public Access URL" ;
    sh:datatype xsd:anyURI ;
  ] ;
  sh:property [
    sh:path epo:involvesProcurementDocument ;
    sh:name "Involves Procurement Document" ;
    sh:nodeKind sh:IRI ;
  ] ;
  sh:property [
    sh:path epo:isProcurementDocumentRestricted ;
    sh:name "Procurement Document Restricted" ;
    sh:datatype xsd:boolean ;
  ] .
`

const MAX_ENTITIES_DISPLAY = 20
const MAX_UNMATCHED_DISPLAY = 50
const MAX_PROPERTY_VALUE_LENGTH = 200

// Create named nodes helper
const ns = (prefix, localName) => {
  const namespace = NAMESPACES[prefix]
  if (!namespace) {
    console.warn(`Unknown namespace prefix: ${prefix}`)
    return rdf.namedNode(`${prefix}:${localName}`)
  }
  return rdf.namedNode(namespace + localName)
}

// Utility class for SHACL processing
class ShaclProcessor {
  constructor() {
    this.rdfType = ns('rdf', 'type')
    this.nodeShape = ns('sh', 'NodeShape')
    this.targetClass = ns('sh', 'targetClass')
    this.property = ns('sh', 'property')
    this.path = ns('sh', 'path')
    this.name = ns('sh', 'name')
    this.datatype = ns('sh', 'datatype')
    this.node = ns('sh', 'node')
    this.nodeKind = ns('sh', 'nodeKind')

    this.labelProperties = [
      ns('dcterms', 'title'),
      ns('epo', 'hasLegalName'),
      ns('rdfs', 'label'),
      ns('skos', 'prefLabel')
    ]
  }

  /**
   * Extract local name from URI
   */
  getLocalName(uri) {
    if (!uri || typeof uri !== 'string') return ''
    const match = uri.match(/[#\/]([^#\/]+)$/)
    return match ? match[1] : uri
  }

  /**
   * Parse SHACL shapes from Turtle
   */
  async parseShapes(ttl) {
    try {
      const parser = new Parser({ format: 'text/turtle' })
      const quads = await new Promise((resolve, reject) => {
        try {
          const result = parser.parse(ttl)
          resolve(result)
        } catch (err) {
          reject(err)
        }
      })
      return rdf.dataset([...quads])
    } catch (err) {
      throw new Error(`Failed to parse SHACL shapes: ${err.message}`)
    }
  }

  /**
   * Find all node shapes in dataset
   */
  findNodeShapes(shapesDataset) {
    const shapes = []

    try {
      // Find all NodeShapes
      const nodeShapeQuads = shapesDataset.match(null, this.rdfType, this.nodeShape)

      for (const quad of nodeShapeQuads) {
        const shapeNode = quad.subject

        // Find target classes
        const targetQuads = shapesDataset.match(shapeNode, this.targetClass, null)

        for (const targetQuad of targetQuads) {
          const shapeInfo = {
            uri: shapeNode.value,
            targetClass: targetQuad.object,
            targetClassName: this.getLocalName(targetQuad.object.value),
            properties: this.extractShapeProperties(shapesDataset, shapeNode)
          }
          shapes.push(shapeInfo)
        }
      }
    } catch (err) {
      console.error('Error finding node shapes:', err)
    }

    return shapes
  }

  /**
   * Extract properties from a shape
   */
  extractShapeProperties(shapesDataset, shapeNode) {
    const properties = []

    try {
      const propQuads = shapesDataset.match(shapeNode, this.property, null)

      for (const propQuad of propQuads) {
        const propNode = propQuad.object

        // Get property details
        const pathQuad = this.getFirstQuad(shapesDataset, propNode, this.path)
        if (!pathQuad) continue

        const nameQuad = this.getFirstQuad(shapesDataset, propNode, this.name)
        const datatypeQuad = this.getFirstQuad(shapesDataset, propNode, this.datatype)
        const nodeQuad = this.getFirstQuad(shapesDataset, propNode, this.node)
        const nodeKindQuad = this.getFirstQuad(shapesDataset, propNode, this.nodeKind)

        properties.push({
          path: pathQuad.object,
          name: nameQuad ? nameQuad.object.value : this.getLocalName(pathQuad.object.value),
          datatype: datatypeQuad ? datatypeQuad.object.value : null,
          nodeShape: nodeQuad ? nodeQuad.object.value : null,
          nodeKind: nodeKindQuad ? nodeKindQuad.object.value : null
        })
      }
    } catch (err) {
      console.error('Error extracting shape properties:', err)
    }

    return properties
  }

  /**
   * Get first matching quad
   */
  getFirstQuad(dataset, subject, predicate) {
    const quads = dataset.match(subject, predicate, null)
    return quads.size > 0 ? [...quads][0] : null
  }

  /**
   * Format a property value for display
   */
  formatValue(term, datatype) {
    if (!term) return ''

    switch (term.termType) {
      case 'NamedNode':
        return this.getLocalName(term.value)

      case 'BlankNode':
        return `_:${term.value}`

      case 'Literal':
        return this.formatLiteral(term, datatype)

      default:
        return String(term.value)
    }
  }

  /**
   * Format a literal value
   */
  formatLiteral(literal, datatype) {
    const dt = datatype || literal.datatype?.value
    let value = literal.value

    // Handle dates
    if (dt && dt.includes('date')) {
      try {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString()
        }
      } catch {
        // Fall through to return raw value
      }
    }

    // Handle numbers
    if (dt && dt.match(/decimal|integer|double|float/)) {
      const num = Number(value)
      if (!isNaN(num)) {
        return num.toLocaleString()
      }
    }

    // Handle booleans
    if (dt && dt.includes('boolean')) {
      return value === 'true' ? '✓' : '✗'
    }

    // Truncate long strings
    if (value.length > MAX_PROPERTY_VALUE_LENGTH) {
      return value.slice(0, MAX_PROPERTY_VALUE_LENGTH - 3) + '...'
    }

    return value
  }

  /**
   * Get label for an entity
   */
  getEntityLabel(dataset, subject) {
    for (const prop of this.labelProperties) {
      const quad = this.getFirstQuad(dataset, subject, prop)
      if (quad) {
        return this.formatValue(quad.object, null)
      }
    }
    return this.getLocalName(subject.value)
  }

  /**
   * Process entities based on shapes
   */
  processEntities(dataset, shapesDataset, limit = MAX_ENTITIES_DISPLAY) {
    if (!dataset || !shapesDataset) return []

    const entities = []
    const processedSubjects = new Set()
    const shapes = this.findNodeShapes(shapesDataset)

    for (const shape of shapes) {
      try {
        const instances = dataset.match(null, this.rdfType, shape.targetClass)

        for (const instance of instances) {
          const subject = instance.subject

          // Skip if already processed
          if (processedSubjects.has(subject.value)) continue
          processedSubjects.add(subject.value)

          const entity = {
            uri: subject.value,
            subject: subject,
            type: shape.targetClassName,
            typeURI: shape.targetClass.value,
            label: this.getEntityLabel(dataset, subject),
            properties: this.extractEntityProperties(dataset, subject, shape.properties)
          }

          // Only add entities with properties
          if (entity.properties.length > 0) {
            entities.push(entity)

            // Stop if we've reached the limit
            if (entities.length >= limit) {
              return entities
            }
          }
        }
      } catch (err) {
        console.error(`Error processing shape ${shape.uri}:`, err)
      }
    }

    return entities
  }

  /**
   * Extract properties for an entity
   */
  extractEntityProperties(dataset, subject, shapeProperties) {
    const properties = []

    for (const shapeProp of shapeProperties) {
      try {
        const values = dataset.match(subject, shapeProp.path, null)

        for (const valueQuad of values) {
          const prop = {
            name: shapeProp.name,
            path: shapeProp.path.value,
            value: this.formatValue(valueQuad.object, shapeProp.datatype),
            rawValue: valueQuad.object,
            datatype: shapeProp.datatype,
            nodeShape: shapeProp.nodeShape,
            isResource: valueQuad.object.termType === 'NamedNode'
          }

          // Handle nested properties if node shape is defined
          if (shapeProp.nodeShape && valueQuad.object.termType === 'NamedNode') {
            // For now, just mark that nested properties could be expanded
            prop.hasNestedProperties = true
          }

          properties.push(prop)
        }
      } catch (err) {
        console.error(`Error extracting property ${shapeProp.name}:`, err)
      }
    }

    return properties
  }

  /**
   * Find unmatched triples
   */
  findUnmatchedTriples(dataset, matchedSubjects, limit = MAX_UNMATCHED_DISPLAY) {
    const unmatched = []

    try {
      for (const quad of dataset) {
        if (!matchedSubjects.has(quad.subject.value)) {
          unmatched.push({
            subject: this.getLocalName(quad.subject.value),
            predicate: this.getLocalName(quad.predicate.value),
            object: this.formatValue(quad.object, null)
          })

          if (unmatched.length >= limit) break
        }
      }
    } catch (err) {
      console.error('Error finding unmatched triples:', err)
    }

    return unmatched
  }
}

// Component state
const shaclShapes = ref(DEFAULT_SHACL_TTL)
const shapesDataset = ref(null)
const parseError = ref(null)
const isProcessing = ref(false)
const processor = new ShaclProcessor()

// Parse SHACL shapes
const parseShapes = async () => {
  parseError.value = null
  isProcessing.value = true

  try {
    shapesDataset.value = await processor.parseShapes(shaclShapes.value)
  } catch (err) {
    parseError.value = err.message
    shapesDataset.value = null
  } finally {
    isProcessing.value = false
  }
}

// Computed properties
const tripleCount = computed(() => props.dataset?.size ?? 0)

const shapedEntities = computed(() => {
  if (!props.dataset || !shapesDataset.value || props.tooManyTriples) {
    return []
  }

  try {
    return processor.processEntities(props.dataset, shapesDataset.value)
  } catch (err) {
    console.error('Error computing shaped entities:', err)
    return []
  }
})

const matchedSubjects = computed(() => {
  return new Set(shapedEntities.value.map(e => e.uri))
})

const unmatchedTriples = computed(() => {
  if (!props.dataset || props.tooManyTriples) {
    return []
  }

  try {
    return processor.findUnmatchedTriples(props.dataset, matchedSubjects.value)
  } catch (err) {
    console.error('Error computing unmatched triples:', err)
    return []
  }
})

const hasData = computed(() => {
  return shapedEntities.value.length > 0 || unmatchedTriples.value.length > 0
})

// Watchers
watch(() => props.dataset, () => {
  // Re-process when dataset changes
  if (props.dataset && shapesDataset.value) {
    // Trigger recomputation
    shapedEntities.value
  }
})

// Lifecycle
onMounted(() => {
  parseShapes()
})

// Cleanup
onUnmounted(() => {
  shapesDataset.value = null
})
</script>

<template>
  <div class="simple-view-container">
    <!-- Placeholder State -->
    <div v-if="!props.dataset" class="state-container placeholder-state">
      <div class="state-icon">📋</div>
      <h3>SHACL-Based Simple View</h3>
      <p>Execute a query to see data structured by SHACL shapes</p>
    </div>

    <!-- Too Many Triples State -->
    <div v-else-if="props.tooManyTriples" class="state-container warning-state">
      <div class="state-icon">⚠️</div>
      <h3>Dataset Too Large</h3>
      <p>{{ tripleCount.toLocaleString() }} triples exceed the display limit</p>
      <p class="hint">Please try the Turtle view for large datasets</p>
    </div>

    <!-- Main Interface -->
    <div v-else class="shacl-interface">
      <n-split
          direction="vertical"
          :default-size="0.7"
          :min="0.5"
          :max="0.8"
          style="height: 100%"
      >
        <!-- Data Display Panel -->
        <template #1>
          <div class="data-panel">
            <div class="panel-header">
              <h3>Structured Data</h3>
              <div class="stats">
                <span class="stat-item">
                  <strong>{{ shapedEntities.length }}</strong> entities
                </span>
                <span class="stat-divider">•</span>
                <span class="stat-item">
                  <strong>{{ tripleCount.toLocaleString() }}</strong> triples
                </span>
              </div>
            </div>

            <div class="panel-content">
              <!-- No Data State -->
              <div v-if="!hasData" class="empty-state">
                <div class="empty-icon">🔍</div>
                <p>No data matches the current SHACL shapes</p>
                <p class="hint">Try adjusting your shapes or verify the dataset content</p>
              </div>

              <!-- Entity List -->
              <div v-else class="entities-container">
                <n-collapse v-if="shapedEntities.length > 0">
                  <n-collapse-item
                      v-for="entity in shapedEntities"
                      :key="entity.uri"
                      :name="entity.uri"
                  >
                    <template #header>
                      <div class="entity-header">
                        <n-tag :bordered="false" type="info" size="small">
                          {{ entity.type }}
                        </n-tag>
                        <span class="entity-label">{{ entity.label }}</span>
                      </div>
                    </template>

                    <div class="entity-content">
                      <div class="properties-grid">
                        <div
                            v-for="(prop, idx) in entity.properties"
                            :key="`${entity.uri}-${prop.path}-${idx}`"
                            class="property-item"
                        >
                          <div class="property-name">{{ prop.name }}</div>
                          <div
                              class="property-value"
                              :class="{ 'is-resource': prop.isResource }"
                          >
                            {{ prop.value }}
                            <n-tag
                                v-if="prop.datatype"
                                size="tiny"
                                :bordered="false"
                                class="datatype-tag"
                            >
                              {{ processor.getLocalName(prop.datatype) }}
                            </n-tag>
                          </div>
                        </div>
                      </div>
                    </div>
                  </n-collapse-item>
                </n-collapse>

                <!-- Unmatched Triples -->
                <div v-if="unmatchedTriples.length > 0" class="unmatched-section">
                  <div class="section-header">
                    <h4>Unmatched Triples</h4>
                    <n-tag size="small" round>
                      {{ unmatchedTriples.length }}
                    </n-tag>
                  </div>
                  <div class="triples-list">
                    <div
                        v-for="(triple, idx) in unmatchedTriples"
                        :key="`unmatched-${idx}`"
                        class="triple-row"
                    >
                      <span class="triple-subject">{{ triple.subject }}</span>
                      <span class="triple-predicate">{{ triple.predicate }}</span>
                      <span class="triple-object">{{ triple.object }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- SHACL Editor Panel -->
        <template #2>
          <div class="shacl-panel">
            <div class="panel-header">
              <h3>SHACL Shapes Editor</h3>
              <n-button
                  size="small"
                  type="primary"
                  :loading="isProcessing"
                  :disabled="isProcessing"
                  @click="parseShapes"
              >
                Apply Shapes
              </n-button>
            </div>

            <div class="panel-content">
              <n-input
                  v-model:value="shaclShapes"
                  type="textarea"
                  placeholder="Enter SHACL shapes in Turtle format..."
                  :autosize="{ minRows: 10, maxRows: 30 }"
                  :disabled="isProcessing"
                  class="shacl-editor"
              />

              <n-alert
                  v-if="parseError"
                  type="error"
                  closable
                  @close="parseError = null"
                  class="error-alert"
              >
                {{ parseError }}
              </n-alert>
            </div>
          </div>
        </template>
      </n-split>
    </div>
  </div>
</template>

<style scoped>
.simple-view-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

/* State Containers */
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 40px;
}

.state-icon {
  font-size: 4em;
  margin-bottom: 20px;
  opacity: 0.8;
}

.state-container h3 {
  margin: 0 0 12px 0;
  font-size: 1.5em;
  color: #333;
}

.state-container p {
  margin: 0 0 8px 0;
  color: #666;
  max-width: 400px;
}

.hint {
  font-size: 0.9em;
  font-style: italic;
  color: #999;
}

/* Main Interface */
.shacl-interface {
  height: 100%;
  padding: 12px;
}

/* Panel Styles */
.data-panel,
.shacl-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
  border-radius: 8px 8px 0 0;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.1em;
  font-weight: 600;
  color: #333;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* Stats */
.stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  color: #666;
}

.stat-divider {
  color: #ccc;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #999;
}

.empty-icon {
  font-size: 3em;
  margin-bottom: 16px;
  opacity: 0.5;
}

/* Entities */
.entities-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.entity-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.entity-label {
  font-weight: 500;
  color: #333;
}

.entity-content {
  padding: 12px 0;
}

.properties-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.property-item {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) 2fr;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #e0e0e0;
}

.property-name {
  font-weight: 600;
  color: #2563eb;
  font-size: 0.9em;
}

.property-value {
  color: #374151;
  word-break: break-word;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.property-value.is-resource {
  color: #059669;
  font-weight: 500;
}

.datatype-tag {
  margin-left: auto;
  flex-shrink: 0;
}

/* Unmatched Triples */
.unmatched-section {
  margin-top: 24px;
  padding: 16px;
  background: #fff5f5;
  border-radius: 8px;
  border: 1px solid #ffdddd;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.section-header h4 {
  margin: 0;
  font-size: 1em;
  color: #c53030;
}

.triples-list {
  max-height: 300px;
  overflow-y: auto;
}

.triple-row {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr;
  gap: 12px;
  padding: 8px 12px;
  background: white;
  border-radius: 4px;
  margin-bottom: 4px;
  font-size: 0.85em;
}

.triple-subject {
  font-weight: 500;
  color: #4a5568;
}

.triple-predicate {
  color: #718096;
}

.triple-object {
  color: #4a5568;
  word-break: break-word;
}

/* SHACL Editor */
.shacl-editor {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.error-alert {
  margin-top: 12px;
}

/* Scrollbar Styles */
.panel-content::-webkit-scrollbar {
  width: 8px;
}

.panel-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 4px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

/* Collapse Customization */
:deep(.n-collapse-item__header) {
  padding: 12px 16px !important;
}

:deep(.n-collapse-item__content-inner) {
  padding: 0 16px !important;
}

/* Split Pane */
:deep(.n-split-pane-1) {
  margin-bottom: 8px;
}

:deep(.n-split-pane-2) {
  margin-top: 8px;
}
</style>
