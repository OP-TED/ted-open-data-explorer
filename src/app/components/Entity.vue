<script setup>
import { ArrowUp } from '@vicons/ionicons5'
import { NIcon } from 'naive-ui'
import { onMounted, ref, toRaw } from 'vue'
import Row from './Row.vue'
import Term from './Term.vue'
import { ns } from '../../namespaces.js'

const props = defineProps({
  pointer: Object,
})
const inDataset = ref()

onMounted(() => {
  inDataset.value = !!document.getElementById(`${props.pointer.term.value}`)
})

function getClassForType (types) {
  // Styles from https://stephango.com/flexoki

  for (const type of types) {
    if (type.value.startsWith('http://data.europa.eu/a4g/ontology#') && type.value.endsWith('Term')) {
      return 'entity-header-term'
    }
    if (type.equals(ns.org.Organization)) {
      return 'entity-header-organization'
    }
    if (type.equals(ns.epo.Lot)) {
      return 'entity-header-lot'
    }
    if (type.equals(ns.epo.Notice)) {
      return 'entity-header-notice'
    }
    if (type.equals(ns.adms.Identifier)) {
      return 'entity-header-identifier'
    }
    if (type.equals(ns.epo.MonetaryValue)) {
      return 'entity-header-monetary-value'
    }
  }
  return 'entity-header'
}

</script>

<template>
  <template v-if="pointer.rows.length">
    <div class="entity" :id="pointer.term.value">
      <div :class="getClassForType(pointer.types)">
        <Term :term="pointer.term"/>
      </div>
      <div class="rows">
        <template v-for="row of pointer.rows">
          <Row :row="row"/>
        </template>
      </div>
    </div>
  </template>
  <template v-else>
    <template v-if="pointer.isInternalLink && inDataset">
      <a :href="`#${pointer.term.value}`">
        {{ pointer.term.value }}
        <NIcon>
          <ArrowUp/>
        </NIcon>
      </a>
    </template>
    <template v-else>
      <Term :term="pointer.term"/>
    </template>

  </template>
</template>

<style>

.entity-header-organization {
  background: rgba(139, 126, 200, 0.2);
}

.entity-header-lot {
  background: rgba(208, 162, 21, 0.2);
}

.entity-header-notice {
  background: rgba(135, 154, 57, 0.2);
}

.entity-header-identifier {
  background: rgba(58, 169, 159, 0.2);
}

.entity-header-monetary-value {
  background: rgba(206, 93, 151, 0.2);
}

.entity-header-term {
  background: rgb(67, 133, 190, 0.2);
}
</style>
