<script setup>
import { ns } from '../../namespaces.js'
import { computed } from 'vue'
import { useSelectionController } from '../controllers/selectionController.js'
import { NIcon } from 'naive-ui'
import { LinkOutline as LinkIcon } from '@vicons/ionicons5'

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

const showAsIcon = computed(() =>
    props.term.termType === 'NamedNode' &&
    props.term.value.startsWith('http://data.europa.eu/a4g/resource/'),
)
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
        <template v-if="showAsIcon">
          <!-- ✅ Naive UI handles sizing here -->
          <NIcon size="14" class="text-gray-500">
            <LinkIcon/>
          </NIcon>
        </template>
        <template v-else>
          <span v-if="namedNodeDisplay.prefix" class="vocab">
            {{ namedNodeDisplay.prefix }}:{{ namedNodeDisplay.display }}
          </span>
          <span v-else>
            {{ namedNodeDisplay.display }}
          </span>
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
