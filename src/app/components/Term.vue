<script setup xmlns="http://www.w3.org/1999/html">

import { ns } from '../../namespaces.js'
import { computed, ref } from 'vue'
import { useSelectionController } from '../controllers/selectionController.js'

const props = defineProps({
  term: Object,
})

function getDatatype (term) {
  function shrink (x) {
    return x ? x.split('#').pop() : 'NONE'
  }

  return term.datatype ? shrink(term.datatype.value) : ''
}

function getLanguage (term) {
  return term.language
}

const knownNamespaces = { ...ns }

function guessPrefix (value) {
  for (const [prefix, namespace] of Object.entries(knownNamespaces)) {
    const startURL = namespace().value
    if (value.startsWith(startURL)) {
      return { prefix, display: value.replaceAll(startURL, ''), href: value }
    }
  }
  return { display: value, href: value }
}

const termLabel = computed(() => {
  return props.term.termType === 'NamedNode' ? guessPrefix(props.term.value) : undefined
})

const controller = useSelectionController()

function select (term, termLabel) {

  if (term.value.startsWith('http://data.europa.eu/a4g/resource/authority')) {
    controller.selectNamed(term, termLabel)
  } else if (term.value.startsWith('http://data.europa.eu/a4g/resource/')) {
    // More expensive, reserved for instance
    controller.selectNamedDescribe(term, termLabel)
  } else {
    controller.selectNamed(term, termLabel)

  }

}

</script>
<template>

  <div>
    <span>
      <slot></slot>
    </span>

    <template v-if="termLabel">
      <a href="#" @click="select(term, termLabel)"><span v-if="termLabel.prefix"
                                                         class="vocab"> {{termLabel.prefix}}</span>{{termLabel.display}}</a>
    </template>
    <template v-else>
      {{ term.value }}
      <span class="datatype">{{ getDatatype(term) }}</span>
      <span class="language">{{ getLanguage(term) }}</span>
    </template>

  </div>

</template>

