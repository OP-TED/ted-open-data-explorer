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

const namedNodeDisplay = computed(() => {
  return props.term.termType === 'NamedNode' ? guessPrefix(props.term.value) : undefined
})

const controller = useSelectionController()

function selectNamed (term) {
  controller.selectFacet({
    type: 'named-node',
    term,
  })
}
</script>
<template>
  <div>
    <span>
      <slot></slot>
    </span>

    <template v-if="namedNodeDisplay">
      <a :href="namedNodeDisplay.href" @click.prevent="selectNamed(term)">
        <span v-if="namedNodeDisplay.prefix" class="vocab">
          {{ namedNodeDisplay.prefix }}:{{ namedNodeDisplay.display }}
        </span>
        <span v-else>
          {{ namedNodeDisplay.display }}
        </span>
      </a>
    </template>

    <template v-else>
      {{ term.value }}
      <span class="datatype">{{ getDatatype(term) }}</span>
      <span class="language">{{ getLanguage(term) }}</span>
    </template>
  </div>
</template>


