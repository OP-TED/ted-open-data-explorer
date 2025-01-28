<script setup>
import { NButton } from 'naive-ui'
import { onMounted, ref, watch } from 'vue'
import { basicSetup } from 'codemirror'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { sparql } from 'codemirror-lang-sparql'

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  isLoading: Boolean,
})

const emit = defineEmits(['update:modelValue'])

const editorContainer = ref(null)

let editor = null

function doExecuteQuery () {
  emit('update:modelValue', currentQuery.value)
}

const currentQuery = ref()

onMounted(() => {

  currentQuery.value = props.modelValue

  editor = new EditorView({
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        basicSetup,
        sparql(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            currentQuery.value = update.state.doc.toString()
            // emit('update:modelValue', update.state.doc.toString())
          }
        }),
      ],
    }),
    parent: editorContainer.value,
  })
})

watch(() => props.modelValue, (newValue) => {
  if (editor && newValue !== editor.state.doc.toString()) {
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: newValue },
    })
  }
})
</script>

<template>
  <div ref="editorContainer" class="cm-editor"></div>
  <n-button @click="doExecuteQuery" :loading="isLoading" class="editor-button">Execute Query</n-button>
</template>

<style scoped>
.cm-editor {
  width: 100%;
  height: 100%;
  font-family: monospace;
  border: 1px solid #ddd;
}
.editor-button {
  margin-top: 8px;
}
</style>
