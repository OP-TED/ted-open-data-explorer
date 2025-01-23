<script setup>
import { onMounted, ref, watch } from 'vue'
import { basicSetup } from 'codemirror'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { sparql } from 'codemirror-lang-sparql'

const props = defineProps({
  modelValue: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const editorContainer = ref(null)
const editorStyle = {
  width: '100%',
  border: '1px solid #ddd',
}

let editor = null

onMounted(() => {
  editor = new EditorView({
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        basicSetup,
        sparql(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            emit('update:modelValue', update.state.doc.toString())
          }
        }),
      ],
    }),
    parent: editorContainer.value,
  })
})

// Watch for changes in the modelValue prop to update the editor's content
watch(() => props.modelValue, (newValue) => {
  if (editor && newValue !== editor.state.doc.toString()) {
    editor.dispatch({
      changes: {from: 0, to: editor.state.doc.length, insert: newValue}
    })
  }
})
</script>

<template>
  <div ref="editorContainer" :style="editorStyle"></div>
</template>

<style scoped>
.cm-editor {
  height: 100%;
  font-family: monospace;
}
</style>
