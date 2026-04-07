/*
 * Copyright 2026 European Union
 *
 * Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European
 * Commission - subsequent versions of the EUPL (the "Licence"); You may not use this work except in
 * compliance with the Licence. You may obtain a copy of the Licence at:
 * https://joinup.ec.europa.eu/software/page/eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence
 * is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the Licence for the specific language governing permissions and limitations under
 * the Licence.
 */
// SparqlPanel — the SPARQL mode of the Search tab.
//
// Swaps the notice-search panel for a CodeMirror SPARQL editor and an
// Execute button. The editor is built on first activation (lazy) to avoid
// loading CodeMirror on pages that only ever use notice search.

import {
  EditorState,
  EditorView,
  bracketMatching,
  closeBrackets,
  closeBracketsKeymap,
  defaultHighlightStyle,
  defaultKeymap,
  drawSelection,
  foldGutter,
  foldKeymap,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSelectionMatches,
  highlightSpecialChars,
  history,
  historyKeymap,
  indentOnInput,
  keymap,
  lineNumbers,
  searchKeymap,
  sparql,
  syntaxHighlighting,
} from '../vendor/codemirror-bundle.js';
import { eclipseHighlightStyle, eclipseTheme } from './cm-theme.js';
import { getQuery } from './facets.js';

class SparqlPanel {
  constructor(controller, { showExplorerTab } = {}) {
    this.controller = controller;
    this.showExplorerTab = showExplorerTab || (() => {});
    this.editor = null;

    this.executeBtn = document.getElementById('execute-query-btn');
    this.editorContainer = document.getElementById('sparql-editor');
    this.noticePanel = document.getElementById('panel-notice');
    this.sparqlPanel = document.getElementById('panel-sparql');

    this._bindEvents();
    this.controller.addEventListener('facet-changed', () => this._onFacetChanged());
  }

  _onFacetChanged() {
    // When the current facet is a SPARQL query (from URL, history, or any
    // other source), flip into SPARQL mode so the user actually sees it.
    if (this.controller.currentFacet?.type === 'query') {
      const radio = document.getElementById('mode-sparql');
      if (radio && !radio.checked) {
        radio.checked = true;
        this._onModeChange(true);
      }
    }
    this._syncQuery();
  }

  _bindEvents() {
    this.executeBtn.addEventListener('click', () => this._execute());

    document.querySelectorAll('input[name="search-mode"]').forEach(radio => {
      radio.addEventListener('change', (e) => this._onModeChange(e.target.value === 'sparql'));
    });
  }

  _onModeChange(isSparql) {
    this.noticePanel.style.display = isSparql ? 'none' : '';
    this.sparqlPanel.style.display = isSparql ? '' : 'none';

    if (isSparql) {
      if (!this.editor) {
        this._initEditor();
        this._syncQuery();
      }
      // CodeMirror needs a re-measure after becoming visible.
      this.editor.requestMeasure();
    }
  }

  _initEditor() {
    this.editor = new EditorView({
      state: EditorState.create({
        doc: '',
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          history(),
          foldGutter(),
          drawSelection(),
          indentOnInput(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          bracketMatching(),
          closeBrackets(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          EditorView.lineWrapping,
          sparql(),
          eclipseTheme,
          eclipseHighlightStyle,
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...foldKeymap,
          ]),
        ],
      }),
      parent: this.editorContainer,
    });
  }

  // Mirror the current facet's SPARQL query into the editor so switching to
  // SPARQL mode shows what's running, not an empty buffer.
  _syncQuery() {
    if (!this.editor) return;
    const facet = this.controller.currentFacet;
    const query = facet ? (getQuery(facet) || '') : '';
    const current = this.editor.state.doc.toString();
    if (current !== query) {
      this.editor.dispatch({
        changes: { from: 0, to: current.length, insert: query },
      });
    }
  }

  _execute() {
    if (!this.editor) return;
    const query = this.editor.state.doc.toString().trim();
    if (!query) return;

    this.controller.search({
      type: 'query',
      query,
      timestamp: Date.now(),
    });
    // Direct user gesture (Execute button) → switch to Explore tab.
    this.showExplorerTab();
  }
}

export { SparqlPanel };
