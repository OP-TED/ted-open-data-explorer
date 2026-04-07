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
// DataView — owns the Explorer tab.
// Responsibilities:
//   - breadcrumb rendering and navigation
//   - switching between Tree, Turtle, Backlinks view modes
//   - Turtle editor (lazily initialised CodeMirror)
//   - disabling the Backlinks tab when no URI is selected
// The actual Tree and Backlinks rendering lives in dedicated classes.

import {
  EditorState,
  EditorView,
  bracketMatching,
  defaultHighlightStyle,
  defaultKeymap,
  drawSelection,
  foldGutter,
  foldKeymap,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSelectionMatches,
  highlightSpecialChars,
  indentOnInput,
  keymap,
  lineNumbers,
  searchKeymap,
  syntaxHighlighting,
  turtle,
} from '../vendor/codemirror-bundle.js';
import { eclipseHighlightStyle, eclipseTheme } from './cm-theme.js';
import { getLabel } from './facets.js';
import { TreeRenderer } from './TreeRenderer.js';

class DataView {
  constructor(controller) {
    this.controller = controller;
    this.viewMode = 'tree';
    this.turtleEditor = null;

    // DOM refs
    this.card = document.getElementById('data-card');
    this.titleEl = document.getElementById('data-card-title');
    this.loadingEl = document.getElementById('data-loading');
    this.errorEl = document.getElementById('data-error');
    this.placeholderEl = document.getElementById('data-placeholder');
    this.treeContainer = document.getElementById('tree-container');
    this.turtleContainer = document.getElementById('turtle-container');
    this.backlinksContainer = document.getElementById('backlinks-container');
    this.breadcrumbEl = document.getElementById('data-breadcrumb');

    this.treeRenderer = new TreeRenderer(this.treeContainer);

    this._bindEvents();
    this._listen();
  }

  _bindEvents() {
    document.querySelectorAll('input[name="view-mode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.viewMode = e.target.value;
        this._showCurrentView();
      });
    });
  }

  _listen() {
    // `facet-changed` already drives _onFacetChanged, which calls
    // _renderBreadcrumb itself. Subscribing to `breadcrumb-changed`
    // separately would re-render the breadcrumb twice on every
    // navigation — drop the redundant listener.
    this.controller.addEventListener('facet-changed', () => this._onFacetChanged());
    this.controller.addEventListener('results-changed', () => this._onResultsChanged());
    this.controller.addEventListener('loading-changed', () => this._onLoadingChanged());
  }

  _onFacetChanged() {
    const facet = this.controller.currentFacet;
    if (!facet) {
      this.card.style.display = 'none';
      return;
    }

    this.card.style.display = '';
    this._renderBreadcrumb();
    this._updateBacklinksAvailability(facet);
  }

  _updateBacklinksAvailability(facet) {
    const hasUri = facet.type === 'named-node' && !!facet.term?.value;
    document.getElementById('view-backlinks').disabled = !hasUri;

    // If we were on Backlinks for a node with a URI and the user navigates
    // away to a notice/query facet, fall back to Tree view.
    if (this.viewMode === 'backlinks' && !hasUri) {
      this.viewMode = 'tree';
      document.getElementById('view-tree').checked = true;
      this._showCurrentView();
    }
  }

  _onResultsChanged() {
    const { results, error, currentFacet } = this.controller;

    this.errorEl.style.display = 'none';
    this.placeholderEl.style.display = 'none';

    if (error) {
      this.errorEl.textContent = error.message || 'Query failed';
      this.errorEl.style.display = '';
      this._clearViews();
      return;
    }

    if (!results) {
      this.placeholderEl.style.display = '';
      this._clearViews();
      return;
    }

    this.titleEl.textContent = `${this._titleFor(currentFacet)} — ${results.size.toLocaleString()} triples`;
    this._renderView(results);
  }

  // Title for the data card. For named-node and query facets the label
  // already begins with the resource type (e.g. "ChangedSectionIdentifier
  // 6da4hK8…") so it stands on its own. For notice-number facets the
  // label is just the publication number, which reads better when
  // prefixed with "Notice" so the title pattern matches the deeper
  // navigation cases.
  _titleFor(facet) {
    const label = getLabel(facet);
    return facet?.type === 'notice-number' ? `Notice ${label}` : label;
  }

  // Clear every view mode's content so a failed/empty query does not leave
  // stale data from a previous successful query visible. Backlinks is
  // cleared too even though it is owned by BacklinksView — when a query
  // fails on a named-node facet that previously had backlinks, switching
  // to the Backlinks view would otherwise show stale subjects from the
  // earlier URI.
  _clearViews() {
    this.treeContainer.innerHTML = '';
    this._renderTurtle('');
    const backlinksContent = document.getElementById('backlinks-content');
    if (backlinksContent) backlinksContent.innerHTML = '';
  }

  _onLoadingChanged() {
    this.loadingEl.style.display = this.controller.isLoading ? '' : 'none';
  }

  _renderView(results) {
    if (this.viewMode === 'tree') {
      this.treeRenderer.render(results.quads);
    } else if (this.viewMode === 'turtle') {
      this._renderTurtle(results.rawTurtle);
    }
    this._showCurrentView();
  }

  _showCurrentView() {
    this.treeContainer.style.display = this.viewMode === 'tree' ? '' : 'none';
    this.turtleContainer.style.display = this.viewMode === 'turtle' ? '' : 'none';
    this.backlinksContainer.style.display = this.viewMode === 'backlinks' ? '' : 'none';

    if (this.viewMode === 'turtle') {
      if (!this.turtleEditor) this._initTurtleEditor();
      // Always sync the editor's contents from the controller's current
      // results. _renderView only updates Turtle when Turtle is the
      // active mode, so a notice loaded while Tree was active leaves the
      // editor showing the previous notice's RDF until we re-render here.
      this._renderTurtle(this.controller.results?.rawTurtle ?? '');
      this.turtleEditor.requestMeasure();
    }
  }

  _initTurtleEditor() {
    this.turtleEditor = new EditorView({
      state: EditorState.create({
        doc: '',
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          foldGutter(),
          drawSelection(),
          indentOnInput(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          bracketMatching(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          EditorView.lineWrapping,
          turtle(),
          eclipseTheme,
          eclipseHighlightStyle,
          EditorState.readOnly.of(true),
          keymap.of([...defaultKeymap, ...searchKeymap, ...foldKeymap]),
        ],
      }),
      parent: this.turtleContainer,
    });
  }

  _renderTurtle(rawTurtle) {
    if (!this.turtleEditor) return;
    const currentDoc = this.turtleEditor.state.doc.toString();
    if (currentDoc !== rawTurtle) {
      this.turtleEditor.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: rawTurtle || '' },
      });
    }
  }

  _renderBreadcrumb() {
    this.breadcrumbEl.innerHTML = '';
    const crumbs = this.controller.breadcrumb;
    const currentIdx = this.controller.breadcrumbIndex;

    // Only show items up to and including the current position.
    // Trailing forward-history items are hidden.
    crumbs.slice(0, currentIdx + 1).forEach((facet, i) => {
      this.breadcrumbEl.appendChild(this._buildBreadcrumbItem(facet, i, i === currentIdx));
    });
  }

  _buildBreadcrumbItem(facet, index, isCurrent) {
    const li = document.createElement('li');
    li.className = 'breadcrumb-item';
    if (isCurrent) li.classList.add('active');

    const label = getLabel(facet);
    const isHome = index === 0;

    const target = isCurrent ? li : document.createElement('a');
    if (!isCurrent) {
      target.href = '#';
      target.addEventListener('click', (e) => {
        e.preventDefault();
        this.controller.goTo(index);
      });
      li.appendChild(target);
    }

    if (isHome) {
      const icon = document.createElement('i');
      icon.className = 'bi bi-house-door';
      target.appendChild(icon);
      target.appendChild(document.createTextNode(' '));
    }
    target.appendChild(document.createTextNode(label));

    return li;
  }
}

export { DataView };
