<script setup>
import { NTag } from "naive-ui";
import { computed } from "vue";
import { safeParseFacet } from "../schemas.js";

const props = defineProps({
    facet: {
        type: Object,
        required: true,
        validator: (value) => safeParseFacet(value).success,
    },
    index: Number,
    isSelected: Boolean,
    totalTriples: Number,
});

const emit = defineEmits(["select", "remove"]);

const tagType = computed(() => (props.isSelected ? "info" : "default"));

function handleClick() {
    emit("select", props.index);
}

function handleClose(e) {
    emit("remove", props.index);
}

const facetLabel = computed(() => {
    return props.facet.label || props.facet.value || "unnamed";
});
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

            <!-- Additional metadata -->
            <template v-if="isSelected && totalTriples !== undefined">
                <span class="triples-count">({{ totalTriples }} triples)</span>
            </template>

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
}

.facet-icon {
    font-size: 14px;
    display: inline-flex;
    align-items: center;
}

.facet-label {
    font-weight: 500;
}

.triples-count {
    font-size: 0.9em;
    opacity: 0.85;
}

.timestamp {
    font-size: 0.8em;
    opacity: 0.7;
    margin-left: 8px;
}
</style>
