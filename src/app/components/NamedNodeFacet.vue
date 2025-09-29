<script setup>
import { computed } from 'vue'
import { NCard } from 'naive-ui'

const props = defineProps({
  facet: {
    type: Object,
    required: true
  }
})

const nodeUrl = computed(() => {
  return props.facet?.term?.value || ''
})

const displayUrl = computed(() => {
  const url = nodeUrl.value
  if (!url) return ''

  try {
    const urlObj = new URL(url)
    return urlObj.pathname.split('/').pop() || url
  } catch {
    return url
  }
})
</script>

<template>
  <div class="named-node-facet">
    <n-card size="small" class="node-card">
      <div class="node-info">
        <div class="node-title">Named Node</div>
        <div class="node-url">
          <a :href="nodeUrl" target="_blank" rel="noopener noreferrer" class="url-link">
            {{ displayUrl }}
          </a>
        </div>
        <div class="full-url">{{ nodeUrl }}</div>
      </div>
    </n-card>
  </div>
</template>

<style scoped>
.named-node-facet {
  height: 100%;
  overflow-y: auto;
}

.node-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.node-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.node-title {
  font-weight: 600;
  color: #333;
  font-size: 0.9em;
}

.node-url {
  margin-bottom: 4px;
}

.url-link {
  color: #1976d2;
  text-decoration: none;
  font-weight: 500;
  word-break: break-all;
}

.url-link:hover {
  text-decoration: underline;
}

.full-url {
  font-size: 0.75em;
  color: #666;
  word-break: break-all;
  font-family: monospace;
  background: #f5f5f5;
  padding: 4px 6px;
  border-radius: 4px;
}
</style>