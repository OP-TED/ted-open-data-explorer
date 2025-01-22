<script setup xmlns="http://www.w3.org/1999/html">
import { ChevronDown, ChevronForwardOutline } from '@vicons/ionicons5'

import { NIcon } from 'naive-ui'
import { ref } from 'vue'
import Entity from './Entity.vue'
import Term from './Term.vue'

const props = defineProps({
  row: Object,
})

const show = ref(true)

function toggle () {
  show.value = !show.value
}

</script>
<template>
  <div class="row">
    <ul class="property">
      <li>
        <div style="display: flex; align-items: center;">
          <slot></slot>
          <template v-if=" row.values.length > 1">
            <template v-if="show">
              <NIcon @click="toggle">
                <ChevronDown/>
              </NIcon>
            </template>
            <template v-else>
              <NIcon @click="toggle">
                <ChevronForwardOutline/>
              </NIcon>
            </template>
          </template>
          <Term :term="row.predicate"></Term>
        </div>
      </li>

    </ul>
    <ul class="value">
      <template v-if="show">
        <li v-for="v of row.values">
          <Entity :pointer="v"/>
        </li>
      </template>
      <template v-else>
        <li>
          ({{ row.values.length }})
        </li>
      </template>
    </ul>
  </div>


</template>

