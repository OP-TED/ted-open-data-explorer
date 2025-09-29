<script setup>
import { computed } from 'vue'

const props = defineProps({
  facet: {
    type: Object,
    required: true
  }
})

const nodeUrl = computed(() => props.facet?.term?.value || '')

const displayName = computed(() => {
  const url = nodeUrl.value
  return url.split('/').pop() || url.split('#').pop() || url
})
</script>

<template>
  <div class="named-node-facet">
    <div class="node-title">Named Node</div>
    <a :href="nodeUrl" target="_blank" rel="noopener noreferrer" class="url-link">
      {{ displayName }}
    </a>
    <div class="full-url">{{ nodeUrl }}</div>
  </div>
</template>

<style scoped>
.named-node-facet {
  height: 100%;
  overflow-y: auto;
}

</style>
