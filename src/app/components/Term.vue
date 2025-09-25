<script setup>
import { ns } from '../../namespaces.js'
import { computed } from 'vue'
import { useSelectionController } from '../controllers/selectionController.js'

const props = defineProps({
  term: { type: Object, required: true },
})

const controller = useSelectionController()
const namespaces = { ...ns }

function getDatatype (term) {
  if (!term.datatype) return ''
  return term.datatype.value.split('#').pop() || 'NONE'
}

function getLanguage (term) {
  return term.language || ''
}

function resolvePrefix (value) {
  for (const [prefix, namespace] of Object.entries(namespaces)) {
    const base = namespace().value
    if (value.startsWith(base)) {
      return {
        prefix,
        display: value.replace(base, ''),
        href: value,
      }
    }
  }

  return { display: value.replaceAll('http://publications.europa.eu/resource/authority/', ''), href: value }
}

const namedNodeDisplay = computed(() =>
    props.term.termType === 'NamedNode'
        ? resolvePrefix(props.term.value)
        : undefined,
)

function selectNamedNode (term) {
  controller.selectFacet({
    type: 'named-node',
    term,
  })
}

</script>
<template>
  <div>
    <span><slot/></span>
    <template v-if="namedNodeDisplay">
      <a
          :href="namedNodeDisplay.href"
          @click.prevent="selectNamedNode(term)"
          class="inline-flex items-center"
      >
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
