<script setup>
import { computed, ref, watch } from 'vue'
import { NRadioGroup, NRadioButton, NButton, NIcon } from 'naive-ui'
import { ChevronBackOutline, ChevronForwardOutline } from '@vicons/ionicons5'
import { RdfTree } from '../../../node_modules/rdf-tree'
import 'rdf-tree/dist/rdf-tree.css'
import grapoi from 'grapoi'
import rdf from 'rdf-ext'
import Term from './Term.vue'
import TurtleEditor from './TurtleEditor.vue'
import { useSelectionController, defaultOptions } from '../controllers/selectionController.js'
import { prettyPrint } from '../../serialization.js'
import { ns } from '../../namespaces.js'
import { cssClassifier } from '../../customStyleSelector.js'

const props = defineProps({
  error: Object,
  isLoading: Boolean,
  dataset: Object,
  previousFacet: Object,
  nextFacet: Object,
})

const controller = useSelectionController()

const viewMode = ref('tree')
const turtleContent = ref('')
const isSerializing = ref(false)

const tripleCount = computed(() => props.dataset?.size ?? 0)
const tooManyTriples = computed(() => tripleCount.value > 7000)

const rdfPointer = computed(() => {
  if (!props.dataset || tooManyTriples.value) return null
  return grapoi({ dataset: props.dataset, factory: rdf })
})

async function serializeToTurtle () {
  if (!props.dataset) return
  isSerializing.value = true
  try {
    turtleContent.value = await prettyPrint(props.dataset, ns)
  } catch (error) {
    console.error('Failed to serialize to Turtle:', error)
    turtleContent.value = 'Error serializing RDF data to Turtle format'
  } finally {
    isSerializing.value = false
  }
}

// Auto-serialize when entering Turtle view
watch(viewMode, (mode) => {
  if (mode === 'turtle' && props.dataset) {
    serializeToTurtle()
  }
})

// Reset serialization cache when dataset changes
watch(() => props.dataset, () => {
  turtleContent.value = ''
  if (viewMode.value === 'turtle') {
    serializeToTurtle()
  }
})

// Force Turtle view if too many triples
watch(tooManyTriples, (isTooMany) => {
  if (isTooMany) viewMode.value = 'turtle'
}, { immediate: true })

// Navigation methods
function goToPrevious () {
  if (props.previousFacet) {
    controller.selectFacet(props.previousFacet)
  }
}

function goToNext () {
  if (props.nextFacet) {
    controller.selectFacet(props.nextFacet)
  }
}
</script>

<template>
  <div class="data-content">
    <div v-if="error" class="error-message">{{ error.message }}</div>
    <div v-else-if="isLoading" class="loading-message">Loading...</div>
    <template v-else-if="dataset">
      <div class="data-header">
        <div class="header-top">
          <div class="view-controls">
            <div v-if="previousFacet || nextFacet" class="navigation-controls">
              <n-button
                  size="small"
                  :disabled="!previousFacet"
                  @click="goToPrevious"
                  secondary
              >
                <n-icon>
                  <ChevronBackOutline/>
                </n-icon>
              </n-button>
              <n-button
                  size="small"
                  :disabled="!nextFacet"
                  @click="goToNext"
                  secondary
              >
                <n-icon>
                  <ChevronForwardOutline/>
                </n-icon>
              </n-button>
            </div>
            <n-radio-group v-model:value="viewMode" size="small">
              <n-radio-button value="tree" :disabled="tooManyTriples">
                Tree View
              </n-radio-button>
              <n-radio-button value="turtle" :disabled="isSerializing">
                {{ isSerializing ? 'Serializing...' : 'Turtle' }}
              </n-radio-button>
            </n-radio-group>
          </div>
        </div>
        <div v-if="tooManyTriples" class="too-many-triples-warning">
          Tree view disabled ({{ tripleCount.toLocaleString() }} triples > 7,000 limit)
        </div>
      </div>

      <div v-if="viewMode === 'tree'" class="rdf-tree-container">
        <RdfTree
            v-if="rdfPointer"
            :pointer="rdfPointer"
            :options="defaultOptions"
            :enableHighlighting="false"
            :enableRightClick="false"
            :termComponent="Term"
            :cssClassifier="cssClassifier"
        />
        <div v-else class="no-pointer-message">
          Unable to create tree view for this dataset.
        </div>
      </div>

      <div v-else-if="viewMode === 'turtle'" class="turtle-container">
        <div v-if="isSerializing" class="serializing-message">Serializing...</div>
        <TurtleEditor v-else v-model="turtleContent" :isLoading="false"/>
      </div>
    </template>
    <div v-else class="placeholder">
      Execute a query to see RDF data
    </div>
  </div>
</template>
