<template>
  <div ref="editorContainer" :style="editorStyle"></div>
</template>

<script>
import { onMounted, ref } from 'vue';
import { basicSetup } from 'codemirror';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { sparql } from 'codemirror-lang-sparql';

export default {
  name: 'SparqlEditor',
  props: {
    initialQuery: {
      type: String,
      default: 'SELECT * WHERE { ?s ?p ?o }' // default query
    }
  },
  setup(props, { emit }) {
    const editorContainer = ref(null);
    const editorStyle = {
      width: '100%',
      height: '400px',
      border: '1px solid #ddd',
    };

    onMounted(() => {
      const editor = new EditorView({
        state: EditorState.create({
          doc: props.initialQuery,
          extensions: [
            basicSetup,
            sparql(),
            EditorView.updateListener.of((update) => {
              if (update.docChanged) {
                emit('update:query', update.state.doc.toString());
              }
            }),
          ]
        }),
        parent: editorContainer.value
      });
    });

    return {
      editorContainer,
      editorStyle
    };
  }
};
</script>

<style scoped>
.cm-editor {
  height: 100%;
  font-family: monospace;
}
</style>
