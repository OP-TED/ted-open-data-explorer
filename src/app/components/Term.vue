<script setup>
import { ns } from '../../namespaces.js'
import { computed } from 'vue'
import { useSelectionController } from '../controllers/selectionController.js'
import { useLabelRef } from '../../composables/useLabelResolver.js'

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

  return { display: value, href: value }
}

const namedNodeDisplay = computed(() =>
    props.term.termType === 'NamedNode'
        ? resolvePrefix(props.term.value)
        : undefined,
)

// URI for label resolution (only for NamedNodes)
const uriForLabel = computed(() =>
    props.term.termType === 'NamedNode' ? props.term.value : null,
)

// Use label resolver for EU authority URIs
const { label: resolvedLabel, isLoading: labelLoading } = useLabelRef(uriForLabel)

function selectNamedNode (term) {
  controller.selectFacet({
    type: 'named-node',
    term,
  })
}


function displayAsText(term) {
  return term.termType === 'BlankNode' || term.value.startsWith('b')
}


</script>
<template>
  <div>
    <span><slot/></span>
    <template v-if="displayAsText(term)">
      {{ term.value }}
    </template>
    <template v-else-if="namedNodeDisplay">
      <a
          :href="namedNodeDisplay.href"
          @click.prevent="selectNamedNode(term)"
          class="inline-flex items-center"
      >
        <!-- Show resolved label if available, otherwise fallback to prefix/display -->
        <template v-if="resolvedLabel" class="label" :title="namedNodeDisplay.href">
          {{ resolvedLabel }}
        </template>
        <template v-else-if="namedNodeDisplay.prefix" class="vocab">
          {{ namedNodeDisplay.prefix }}:{{ namedNodeDisplay.display }}
        </template>
        <template v-else>
          {{ namedNodeDisplay.display }}
        </template>

        <!-- Optional loading indicator for labels -->
        <template v-if="labelLoading && !resolvedLabel" class="loading-indicator" title="Loading label...">
          ⏳
        </template>
      </a>
    </template>

    <template v-else>
      {{ term.value }}
      <span class="datatype">{{ getDatatype(term) }}</span>
      <span class="language">{{ getLanguage(term) }}</span>
    </template>
  </div>
</template>

<style scoped>
.label {
  font-weight: 500;
}

.vocab {
  font-family: monospace;
}

.loading-indicator {
  margin-left: 4px;
  font-size: 0.75em;
  opacity: 0.7;
}

.datatype, .language {
  font-size: 0.75em;
  opacity: 0.6;
  margin-left: 4px;
}
</style>
