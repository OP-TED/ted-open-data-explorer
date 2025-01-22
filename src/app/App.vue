<script setup>
import { lightTheme, NButton, NCard, NConfigProvider, NSpace, NCheckbox } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { getEntities } from '../traversers/entities.js'
import EntityList from './components/EntityList.vue'
import { ns } from '../namespaces.js'
import rdf from 'rdf-ext'
import { Parser } from 'n3'
import SparqlEditor from './Editor.vue'

const focusOn = (type) => {
  return {
    ignoreNamedGraphs: true,
    matchers: [
      { // Priority for entities of type
        predicate: ns.rdf.type,
        object: type,
      },
      {}, // Everything else
    ],
  }
}

const parseError = ref()
const entities = ref()

onMounted(() => {

  const turtleStr = '<a> <b> <c> .'
  const parser = new Parser()

  const dataset = rdf.dataset([...parser.parse(turtleStr)])
  const options = focusOn(ns.epo.Notice)
  entities.value = getEntities(dataset, options)
})


</script>

<template>
  <n-config-provider :theme="lightTheme">
    <sparql-editor></sparql-editor>
    {{ parseError }}
    <div class="entity-container">
      <EntityList :entities="entities"/>
    </div>
  </n-config-provider>
</template>
<style>

.entity-container {
  background-color: white;
}
</style>
