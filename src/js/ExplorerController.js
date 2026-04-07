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
// ExplorerController — central state management.
//
// The controller owns two navigation concepts:
//
//   facetsList  — the full search history (notice lookups + SPARQL queries).
//                 Drives the History dropdown in the Search tab. Persisted
//                 in sessionStorage so it survives reloads but not new tabs.
//
//   breadcrumb  — the click path within the current exploration. A fresh
//                 search resets it; clicking a subject in the tree extends
//                 it; clicking a step jumps back and trims everything after.
//                 Not persisted — rebuilding it requires re-traversing.
//
// UI panels subscribe to `facet-changed`, `results-changed`, `loading-changed`
// and `breadcrumb-changed` events.

import { addUnique, getQuery, validateFacet } from './facets.js';
import { doSPARQL as defaultDoSPARQL } from './services/sparqlService.js';

const STORAGE_KEY = 'explorer-facets-v3';

class ExplorerController extends EventTarget {
  // The `doSPARQL` option lets tests inject a stub; production callers
  // (app.js) pass no arguments and get the real worker-backed service.
  constructor({ doSPARQL = defaultDoSPARQL } = {}) {
    super();
    this._doSPARQL = doSPARQL;
    this.facetsList = [];
    this.breadcrumb = [];
    this.breadcrumbIndex = -1;
    this.isLoading = false;
    this.error = null;
    this.results = null;
    // Monotonic token incremented on every navigation. An in-flight query
    // whose token no longer matches is a stale response and gets dropped.
    this._queryToken = 0;
    this._loadFromSession();
  }

  // ── Getters ──

  get currentFacet() {
    if (this.breadcrumbIndex < 0 || this.breadcrumbIndex >= this.breadcrumb.length) return null;
    return this.breadcrumb[this.breadcrumbIndex];
  }

  get canGoBack() {
    return this.breadcrumbIndex > 0;
  }

  get canGoForward() {
    return this.breadcrumbIndex < this.breadcrumb.length - 1;
  }

  // ── Navigation ──

  // A new search: notice lookup or custom SPARQL. Resets the breadcrumb and
  // adds the facet to the persistent search history. When the facet is a
  // notice-number already in history, the breadcrumb is wired to the
  // existing (possibly enriched) object, so later enrichment shows up in
  // `currentFacet` and the History dropdown's active-highlight comparison.
  async search(facet) {
    const stamped = this._withTimestamp(facet);
    const canonical = this._addToHistory(stamped);
    this.breadcrumb = [canonical];
    this.breadcrumbIndex = 0;
    await this._navigated();
  }

  // Clicking a backlink: the user is still within the same original notice
  // context, but the current path no longer applies. Keep the root and
  // insert the backlink target as the second step.
  async exploreFromBacklink(facet) {
    const stamped = this._withTimestamp(facet);
    const root = this.breadcrumb[0];
    this.breadcrumb = root ? [root, stamped] : [stamped];
    this.breadcrumbIndex = this.breadcrumb.length - 1;
    await this._navigated();
  }

  // Clicking a subject in the tree: push onto the breadcrumb. Tree clicks
  // are not added to the search history — they're a breadcrumb concept.
  async explore(facet) {
    const stamped = this._withTimestamp(facet);

    // No-op if the target is already the current facet. Otherwise clicking
    // the root subject's own badge would keep pushing itself onto the
    // breadcrumb. We only compare URIs here — different timestamps don't
    // make it a different facet.
    const current = this.currentFacet;
    if (
      current?.type === 'named-node' &&
      stamped.type === 'named-node' &&
      current.term?.value === stamped.term?.value
    ) {
      return;
    }

    // If we've gone back and now explore a new path, drop the stale forward.
    if (this.breadcrumbIndex < this.breadcrumb.length - 1) {
      this.breadcrumb = this.breadcrumb.slice(0, this.breadcrumbIndex + 1);
    }

    this.breadcrumb.push(stamped);
    this.breadcrumbIndex = this.breadcrumb.length - 1;
    await this._navigated();
  }

  async goBack() {
    if (!this.canGoBack) return;
    this.breadcrumbIndex--;
    await this._navigated({ save: false });
  }

  async goForward() {
    if (!this.canGoForward) return;
    this.breadcrumbIndex++;
    await this._navigated({ save: false });
  }

  // Jump to a specific breadcrumb position and trim everything after it.
  async goTo(index) {
    if (index < 0 || index >= this.breadcrumb.length || index === this.breadcrumbIndex) return;
    this.breadcrumb = this.breadcrumb.slice(0, index + 1);
    this.breadcrumbIndex = index;
    await this._navigated({ save: false });
  }

  // Selecting an item from the History dropdown is treated as a new search.
  async selectFromHistory(facet) {
    await this.search(facet);
  }

  // Generic entry point for URI clicks from the TermRenderer.
  // Named-node facets extend the breadcrumb; everything else resets it.
  async navigateTo(facet) {
    if (facet.type === 'named-node') {
      await this.explore(facet);
    } else {
      await this.search(facet);
    }
  }

  removeFacet(index) {
    this.facetsList.splice(index, 1);
    this._saveToSession();
    this._emit('facets-list-changed');
  }

  // ── URL sharing ──

  getShareableUrl() {
    const facet = this.currentFacet;
    if (!facet) return null;
    const url = new URL(window.location.href);
    url.searchParams.set('facet', JSON.stringify(facet));
    return url.toString();
  }

  // Look for a ?facet=... query parameter and, if present, load it.
  //
  // Returns one of:
  //   { status: 'absent'  }                 — no ?facet= in the URL
  //   { status: 'loaded'  }                 — parsed, validated, search kicked off
  //   { status: 'invalid', reason: 'parse' } — JSON.parse threw
  //   { status: 'invalid', reason: 'shape' } — validated was null
  //
  // The caller (SearchPanel.init) surfaces the invalid cases as a UI
  // banner so the recipient of a broken shared link actually sees the
  // failure instead of a silently blank Search tab.
  initFromUrlParams() {
    const facetParam = new URLSearchParams(window.location.search).get('facet');
    if (!facetParam) return { status: 'absent' };

    let parsed;
    try {
      parsed = JSON.parse(facetParam);
    } catch (e) {
      console.error('Failed to parse facet from URL:', e);
      return { status: 'invalid', reason: 'parse' };
    }

    const validated = validateFacet(parsed);
    if (!validated) return { status: 'invalid', reason: 'shape' };

    this.search(validated);
    return { status: 'loaded' };
  }

  // ── Private ──

  // Return a facet with a timestamp, without mutating the caller's object.
  // Callers are navigation methods that get facets from factories, history
  // clicks, or sessionStorage — all shared references that must not be
  // modified from under other readers.
  _withTimestamp(facet) {
    if (facet.timestamp) return facet;
    return { ...facet, timestamp: Date.now() };
  }

  // Add a facet to the persistent search history and return the canonical
  // reference — either the newly-appended entry or the pre-existing one if
  // addUnique found a duplicate. Non-persisted facet kinds (named-node,
  // query) pass through unchanged so the breadcrumb still has something
  // to point at.
  _addToHistory(facet) {
    if (facet.type !== 'notice-number') return facet;
    const { facets, index } = addUnique(this.facetsList, facet);
    this.facetsList = facets;
    return facets[index];
  }

  // Wipe both the in-memory list and the persisted copy. Used by the
  // "Clear history" item in the Search panel dropdown so that a reload
  // of the same tab no longer surfaces the cleared entries.
  clearHistory() {
    this.facetsList = [];
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Best effort — quota or unavailable storage is fine to ignore.
    }
    this._emit('facets-list-changed');
  }

  // Attach timeline metadata (publication date, notice type, country, …)
  // to a notice-number entry already in the history. Called by NoticeView
  // once the TED API has resolved the procedure for a notice.
  //
  // Mutates the existing entry in place rather than replacing it with a
  // spread copy — otherwise the breadcrumb (which shares the reference
  // from _addToHistory) would see stale, unenriched data, and the History
  // dropdown's active-highlight comparison (which is reference-equality)
  // would silently break. The destructure also prevents enrichment from
  // overwriting identity-defining fields.
  enrichNoticeFacet(publicationNumber, metadata) {
    const entry = this.facetsList.find(
      f => f.type === 'notice-number' && f.value === publicationNumber
    );
    if (!entry) return;
    const { type, value, timestamp, ...safeMetadata } = metadata;
    Object.assign(entry, safeMetadata);
    this._saveToSession();
    this._emit('facets-list-changed');
  }

  // Shared tail of every navigation method: emit events, persist, and run
  // the query for the newly current facet.
  async _navigated({ save = true } = {}) {
    this._emit('facet-changed');
    this._emit('breadcrumb-changed');
    if (save) this._saveToSession();
    await this._executeCurrentQuery();
  }

  async _executeCurrentQuery() {
    const facet = this.currentFacet;
    if (!facet) return;
    const query = getQuery(facet);
    if (!query) return;

    // Capture the token for this query. If the user navigates while the
    // SPARQL call is in flight, `_queryToken` gets bumped and we drop the
    // late response instead of overwriting fresh state.
    const token = ++this._queryToken;
    this.isLoading = true;
    this.error = null;
    this._emit('loading-changed');

    try {
      const results = await this._doSPARQL(query);
      if (token !== this._queryToken) return;
      this.results = results;
      this._emit('results-changed');
    } catch (e) {
      if (token !== this._queryToken) return;
      this.error = e;
      this.results = null;
      console.error('Query execution failed:', e);
      this._emit('results-changed');
    } finally {
      if (token === this._queryToken) {
        this.isLoading = false;
        this._emit('loading-changed');
      }
    }
  }

  _emit(eventName) {
    this.dispatchEvent(new CustomEvent(eventName));
  }

  _saveToSession() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.facetsList));
    } catch {
      // Quota or unavailable — silently ignore.
    }
  }

  _loadFromSession() {
    let stored;
    try {
      stored = sessionStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage may be unavailable (Safari private mode, etc). Best effort.
      return;
    }
    if (!stored) return;

    let parsed;
    try {
      parsed = JSON.parse(stored);
    } catch (e) {
      // Distinguishes "no entry" (handled above) from "corrupt JSON".
      // Visible to a developer with the console open; the user just sees
      // an empty history, which is the right degradation.
      console.warn('Could not parse explorer history from sessionStorage; ignoring.', e);
      return;
    }

    if (!Array.isArray(parsed)) return;
    // Drop anything that isn't a notice search. Old storage from earlier
    // versions of the rewrite may carry queries or named-node facets.
    this.facetsList = parsed
      .filter(f => f?.type === 'notice-number')
      .map(f => validateFacet(f))
      .filter(f => f !== null);
  }
}

export { ExplorerController };
