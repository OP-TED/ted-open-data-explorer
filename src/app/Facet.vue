<script setup>
import { NTag } from 'naive-ui'
import { computed } from 'vue'
import { safeParseFacet } from '../schemas.js'
import { getLabel } from '../facets/facets.js'

const props = defineProps({
  facet: {
    type: Object,
    required: true,
    validator: (value) => safeParseFacet(value).success,
  },
  index: Number,
  isSelected: Boolean,

})

const emit = defineEmits(['select', 'remove'])

const tagType = computed(() => (props.isSelected ? 'info' : 'default'))

function handleClick () {
  emit('select', props.index)
}

function handleClose (e) {
  emit('remove', props.index)
}

const facetLabel = computed(() => {
  return getLabel(props.facet) || 'unnamed'
})
</script>

<template>
  <n-tag
      class="custom-facet-tag"
      :type="tagType"
      closable
      :trigger-click-on-close="false"
      @click="handleClick"
      @close="handleClose"
  >
    <div class="tag-content">
      <!-- Main label -->
      <span class="facet-label">{{ facetLabel }}</span>



      <!-- Maybe add a timestamp or other metadata -->
      <span v-if="facet.timestamp" class="timestamp">
                {{ new Date(facet.timestamp).toLocaleTimeString() }}
            </span>
    </div>
  </n-tag>
</template>

<style scoped>
.custom-facet-tag {
  cursor: pointer;
  transition: all 0.2s ease;
}

.custom-facet-tag:hover {
  transform: translateY(-2px);
}

.tag-content {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 150px;
}

.facet-label {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  direction: rtl;
  text-align: left;
  flex: 1;
  min-width: 0;
}


.timestamp {
  font-size: 0.8em;
  opacity: 0.7;
  margin-left: 8px;
}
</style>
