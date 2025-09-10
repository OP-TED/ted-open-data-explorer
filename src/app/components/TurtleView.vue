<script setup>
import { ref, watch } from 'vue'
import TurtleEditor from './TurtleEditor.vue'
import { prettyPrint } from '../../serialization.js'
import { ns } from '../../namespaces.js'

const props = defineProps({
  dataset: Object,
})

const turtleContent = ref('')
const isSerializing = ref(false)

async function serializeToTurtle() {
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

// Auto-serialize when dataset changes
watch(() => props.dataset, () => {
  turtleContent.value = ''
  if (props.dataset) {
    serializeToTurtle()
  }
}, { immediate: true })
</script>

<template>
  <div class="turtle-container">
    <div v-if="isSerializing" class="serializing-message">Serializing...</div>
    <TurtleEditor v-else v-model="turtleContent" :isLoading="false"/>
  </div>
</template>

<style scoped>
.turtle-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.serializing-message {
  text-align: center;
  color: #666;
  padding: 20px;
  font-style: italic;
}
</style>