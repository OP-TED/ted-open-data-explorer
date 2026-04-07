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
// TED Open Data Explorer — app entry point.
// Wires the controller to every panel, sets up the footer progress bar and
// data period, then kicks off the initial search.

import { BacklinksView } from './BacklinksView.js';
import { DataView } from './DataView.js';
import { ExplorerController } from './ExplorerController.js';
import { NoticeView } from './NoticeView.js';
import { SearchPanel } from './SearchPanel.js';
import { SparqlPanel } from './SparqlPanel.js';
import { setController } from './TermRenderer.js';
import { doSPARQLSelect } from './services/sparqlService.js';

const PROGRESS_TICK_MS = 100;
const PROGRESS_FADE_MS = 2000;

const DATA_PERIOD_QUERY = `PREFIX epo: <http://data.europa.eu/a4g/ontology#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?earliestDate ?latestDate WHERE {
  { SELECT ?date AS ?earliestDate WHERE {
      GRAPH ?g { ?notice a epo:Notice ; epo:hasPublicationDate ?date . FILTER(DATATYPE(?date) = xsd:date) }
    } ORDER BY ASC(?date) LIMIT 1 }
  { SELECT ?date AS ?latestDate WHERE {
      GRAPH ?g { ?notice a epo:Notice ; epo:hasPublicationDate ?date . FILTER(DATATYPE(?date) = xsd:date) }
    } ORDER BY DESC(?date) LIMIT 1 }
}`;

// ── Boot ──

const controller = new ExplorerController();
setController(controller);

// Tab-switch helper. Called only by direct user gestures: clicking the
// Search button (or Enter), picking a notice in the procedure timeline,
// picking an entry in the history dropdown, and clicking Execute on a
// SPARQL query. Every other source of a query — URL params, breadcrumb
// navigation, label fetches — leaves the active tab alone, so reload
// and incidental updates can never teleport the user away from where
// they are.
//
// Beyond switching tabs, this helper also normalises the Explore-tab
// landing state: reset the view mode to Tree (so a previous Turtle/
// Backlinks selection from another notice doesn't carry over) and
// expand the procedure mini-card (so the user immediately sees the
// procedure context). The procedure mini is auto-hidden when the
// current facet isn't a notice search, so the expand is a no-op for
// SPARQL queries.
function showExplorerTab() {
  // Reset view mode → Tree. Setting `.checked` doesn't fire change, so
  // dispatch one manually; DataView listens for change to re-render.
  const treeRadio = document.getElementById('view-tree');
  if (treeRadio && !treeRadio.checked) {
    treeRadio.checked = true;
    treeRadio.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Expand the procedure mini-card. `toggle: false` keeps the constructor
  // from flipping the state on its own; we then explicitly call .show().
  const procedureBody = document.getElementById('explorer-procedure-body');
  if (procedureBody) {
    bootstrap.Collapse.getOrCreateInstance(procedureBody, { toggle: false }).show();
  }

  new bootstrap.Tab(document.getElementById('app-tab-explorer')).show();
}

const searchPanel = new SearchPanel(controller, { showExplorerTab });
new SparqlPanel(controller, { showExplorerTab });
new NoticeView(controller, {
  showExplorerTab,
  setSearchInput: (v) => searchPanel.setInputValue(v),
});
new DataView(controller);
new BacklinksView(controller);

wireProgressBar(controller);
wireStopButton(controller);
initBootstrapTooltips();
loadDataPeriod();
searchPanel.init();

// ── Helpers ──

// While a query is in flight the footer fills its progress bar (the bar
// is animated but always full — there is no actual progress signal) and
// ticks an elapsed-time counter. Both fade out shortly after the query
// completes.
//
// Both `interval` and `fadeTimeout` are cleared at the top of every
// handler invocation, not just in the else branch. This matters because
// rapid successive `loading-changed` events — which can happen when the
// token-race path in _executeCurrentQuery emits a second loading=true
// before the first finish fires — would otherwise leak the previous
// interval (still ticking forever) and let a previous fadeTimeout reset
// the bar to 0% in the middle of a new query.
function wireProgressBar(controller) {
  const progressBar = document.getElementById('progress-bar');
  const queryTimer = document.getElementById('query-timer');
  let interval = null;
  let fadeTimeout = null;
  let startTime = 0;

  controller.addEventListener('loading-changed', () => {
    if (interval) { clearInterval(interval); interval = null; }
    if (fadeTimeout) { clearTimeout(fadeTimeout); fadeTimeout = null; }

    if (controller.isLoading) {
      startTime = Date.now();
      progressBar.style.width = '100%';
      progressBar.classList.add('progress-bar-animated');
      interval = setInterval(() => {
        queryTimer.textContent = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
      }, PROGRESS_TICK_MS);
    } else {
      queryTimer.textContent = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
      progressBar.classList.remove('progress-bar-animated');
      fadeTimeout = setTimeout(() => {
        progressBar.style.width = '0%';
        queryTimer.textContent = '';
        fadeTimeout = null;
      }, PROGRESS_FADE_MS);
    }
  });
}

// Wire the footer stop button. Visible only while a query is in flight;
// clicking it asks the controller to terminate the SPARQL worker and
// clear the current results (treated as a clean "no results", not an
// error). No-op if no query is running.
function wireStopButton(controller) {
  const btn = document.getElementById('stop-query-btn');
  if (!btn) return;

  controller.addEventListener('loading-changed', () => {
    btn.style.display = controller.isLoading ? 'flex' : 'none';
  });

  btn.addEventListener('click', () => {
    controller.cancelCurrentQuery();
  });
}

function initBootstrapTooltips() {
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));
}

// Query the SPARQL endpoint for the earliest and latest publication dates in
// the dataset, and show them in the footer. Silently ignores failures —
// the footer is decorative.
async function loadDataPeriod() {
  try {
    const data = await doSPARQLSelect(DATA_PERIOD_QUERY);
    const bindings = data.results?.bindings?.[0];
    if (!bindings?.earliestDate?.value || !bindings?.latestDate?.value) return;

    document.getElementById('data-period').textContent =
      `Data period: ${_formatFooterDate(bindings.earliestDate.value)} to ${_formatFooterDate(bindings.latestDate.value)}`;

    const infoIcon = document.getElementById('data-period-info');
    infoIcon.style.display = 'inline';
    new bootstrap.Tooltip(infoIcon);
  } catch {
    // Footer is non-critical — fail silently.
  }
}

function _formatFooterDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}
