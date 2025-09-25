<script setup>
import { computed, ref, watch } from 'vue'
import { NRadioGroup, NRadioButton, NButton, NIcon } from 'naive-ui'
import { ChevronBackOutline, ChevronForwardOutline } from '@vicons/ionicons5'
import TreeView from './TreeView.vue'
import TurtleView from './TurtleView.vue'
import { useSelectionController } from '../controllers/selectionController.js'

const props = defineProps({
  error: Object,
  isLoading: Boolean,
  dataset: Object,
  previousFacet: Object,
  nextFacet: Object,
})

const controller = useSelectionController()

const viewMode = ref('tree')

const tripleCount = computed(() => props.dataset?.size ?? 0)
const tooManyTriples = computed(() => tripleCount.value > 7000)

// Component mapping for dynamic component rendering
const viewComponents = {
  tree: TreeView,
  turtle: TurtleView,
}

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
              <n-radio-button value="turtle">
                Turtle
              </n-radio-button>
            </n-radio-group>
          </div>
        </div>
        <div v-if="tooManyTriples" class="too-many-triples-warning">
          Tree view disabled ({{ tripleCount.toLocaleString() }} triples > 7,000 limit)
        </div>
      </div>

      <component
          :is="viewComponents[viewMode]"
          :dataset="dataset"
          :tooManyTriples="tooManyTriples"
          class="view-container"
      />
    </template>
    <div v-else class="placeholder">
      Execute a query to see RDF data
    </div>
  </div>
</template>

<style scoped>
.data-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.data-header {
  padding: 8px 0;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 8px;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.view-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.navigation-controls {
  display: flex;
  gap: 4px;
}

.view-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.too-many-triples-warning {
  margin-top: 8px;
  padding: 8px 12px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  color: #856404;
  font-size: 12px;
}

.placeholder {
  color: #999;
  font-style: italic;
  text-align: center;
}

.error-message {
  color: #d32f2f;
  background: #ffebee;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.loading-message {
  text-align: center;
  color: #666;
  padding: 20px;
}
</style>
