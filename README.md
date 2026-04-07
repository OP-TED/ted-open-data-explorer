# TED Open Data Explorer[^1]

A browser tool for inspecting the RDF data behind individual TED notices. Start from a publication number and drill into the linked resources — lots, contracts, organisations, procedures — to understand how a notice is represented in the eProcurement Ontology (ePO). Custom SPARQL queries are also supported for anyone who wants to go off the beaten path.

## Features

- Look up any TED notice by its publication number and see it rendered as a navigable tree of RDF triples
- Procedure timeline showing every notice in the same procurement procedure
- Three view modes on the same data: **Tree** (collapsible, navigable cards), **Turtle** (raw serialization with syntax highlighting), **Backlinks** (which other resources reference the current one)
- Breadcrumb navigation with back/forward through the exploration path
- Human-readable labels resolved asynchronously from the endpoint for ePO classes, properties, and authority vocabularies
- SPARQL mode with syntax highlighting for custom `CONSTRUCT` / `DESCRIBE` queries
- Shareable URLs that load a specific notice or query directly
- Search history of past notice lookups with one-click revisit and a **Clear history** option (kept for the current tab; cleared when the tab closes)

## Live Version

Visit the live application at [docs.ted.europa.eu/ted-open-data-explorer](https://docs.ted.europa.eu/ted-open-data-explorer/).

## Development Setup

### Prerequisites

- Node.js v20 or higher (the built-in `node:test` runner is used for the test suite)
- npm (comes with Node.js)

### Installation & Running

1. Clone the repository:
    ```bash
    git clone https://github.com/OP-TED/ted-open-data-explorer.git
    cd ted-open-data-explorer
    ```

2. Install dependencies (only needed for the CORS proxy and for rebuilding the CodeMirror bundle):
    ```bash
    npm install
    ```

3. Start the CORS proxy, which also serves the static site:
    ```bash
    npm start
    # or directly:
    node scripts/cors-proxy.cjs
    ```

4. Open the application at `http://localhost:8080`.
   The CORS proxy serves `index.html` and the `src/` directory, and forwards `/sparql` requests to the EU Publications Office endpoint.

### Local Development Setup

The application consists of:

1. A static web site (`index.html` plus everything under `src/`)
2. A Node.js CORS proxy (`scripts/cors-proxy.cjs`) that both serves the static files and proxies SPARQL requests to the Publications Office endpoint (bypassing browser CORS restrictions)

No bundler is used for the application code — the browser loads the ES modules directly. Only CodeMirror is pre-bundled (see below).

### Running the Test Suite

The test suite uses Node's built-in [`node:test`](https://nodejs.org/api/test.html) runner, so it has **zero runtime dependencies**:

```bash
npm test
```

The suite covers facet validation, SPARQL response normalisation, URL round-tripping, the three request-token race guards, and the label-service batching reentrancy. It runs in under two seconds.

### Updating CodeMirror

The SPARQL and Turtle editors use a self-hosted CodeMirror v6 bundle (`src/vendor/codemirror-bundle.js`) to avoid CDN version drift issues. This bundle is committed to the repository and only needs to be rebuilt when updating CodeMirror versions:

1. Update the versions in `package.json` under `devDependencies`
2. Run `npm install`
3. Run `npm run build:codemirror`
4. Commit the updated bundle

### Environment Configuration

The application talks to two different back-ends:

- **TED Search API** for notice lookups and procedure timelines. The base URL is chosen automatically based on `window.location.hostname`:
  - Production hosts (`docs.ted.europa.eu`, `data.ted.europa.eu`) use `https://api.ted.europa.eu/v3`
  - Every other host (localhost, staging, preview builds) uses `https://api.acceptance.ted.europa.eu/v3`
- **SPARQL endpoint** at the EU Publications Office (Cellar). In development this goes through the local CORS proxy; in production the browser hits it directly.

No `.env` file is needed — these routes are hard-coded in `src/js/services/tedAPI.js` and `src/js/services/sparqlService.js`.

### Corporate Proxy Configuration

If you're behind a corporate proxy, set the proxy environment variables before starting the CORS proxy:

```bash
# Windows
set HTTP_PROXY=http://username:password@your.proxy.host:port
set HTTPS_PROXY=http://username:password@your.proxy.host:port

# Linux/Mac
export HTTP_PROXY=http://username:password@your.proxy.host:port
export HTTPS_PROXY=http://username:password@your.proxy.host:port
```

## Repository Structure

```
index.html                      — single-page app entry
src/
  assets/style.css              — custom styles on top of Bootstrap
  js/
    app.js                      — wiring and startup
    ExplorerController.js       — central state + navigation
    SearchPanel.js              — notice search UI (Search tab)
    SparqlPanel.js              — SPARQL editor UI (Search tab)
    NoticeView.js               — procedure timeline rendering
    DataView.js                 — Explore tab: tree/turtle/backlinks modes
    TreeRenderer.js             — RDF tree view with lazy nested cards
    TermRenderer.js             — RDF term / badge rendering
    BacklinksView.js            — incoming references view
    facets.js                   — facet shape, validation, equality
    namespaces.js               — prefix map + URI shortening
    cm-theme.js                 — CodeMirror theme
    sparqlWorker.js             — Web Worker for SPARQL fetches
    services/
      sparqlService.js          — worker-backed SPARQL client
      tedAPI.js                 — TED Search API client
      labelService.js           — batched label resolution
      randomNotice.js           — "pick a random notice" service
  vendor/
    codemirror-bundle.js        — pre-built CodeMirror v6 (see above)
    codemirror-entry.js         — bundle entry point
scripts/
  cors-proxy.cjs                — dev server + SPARQL CORS proxy
  build-codemirror.cjs          — esbuild wrapper for the bundle
test/
  _helpers.js                   — shared test shims (sessionStorage, window, document)
  *.test.js                     — node:test suites
.github/workflows/
  pages.yml                     — GitHub Pages deployment
  test.yml                      — CI test runner
```

## Third-Party Components

This project uses the following third-party components:

### Application

- **Bootstrap** (v5.3.8)
  - Purpose: CSS framework for styling and components
  - License: MIT
  - Website: https://getbootstrap.com/

- **Bootstrap Icons** (v1.11.3)
  - Purpose: Icon library
  - License: MIT
  - Website: https://icons.getbootstrap.com/

- **CodeMirror** (v6)
  - Purpose: SPARQL and Turtle editors
  - License: MIT
  - Website: https://codemirror.net/

- **codemirror-lang-sparql** (v2.0.0)
  - Purpose: SPARQL syntax highlighting for CodeMirror
  - License: MIT
  - Website: https://github.com/aatauil/codemirror-lang-sparql

- **codemirror-lang-turtle**
  - Purpose: Turtle syntax highlighting for CodeMirror
  - License: MIT

- **N3.js** (v1.23.1)
  - Purpose: RDF/Turtle parser
  - License: MIT
  - Website: https://github.com/rdfjs/N3.js

### Development Tools

- **Express** (v4.17.1)
  - Purpose: Local CORS proxy server
  - License: MIT
  - Website: https://expressjs.com/

- **cors** (v2.8.6)
  - Purpose: CORS middleware for Express
  - License: MIT
  - Website: https://github.com/expressjs/cors

- **esbuild** (v0.27.4)
  - Purpose: CodeMirror bundler
  - License: MIT
  - Website: https://esbuild.github.io/

All third-party components are used under their respective licenses.

## Data Source

The application queries two endpoints:

- The **TED Search API** (`https://api.ted.europa.eu/v3` in production, `https://api.acceptance.ted.europa.eu/v3` elsewhere) for notice metadata and procedure timelines
- The **Publications Office SPARQL endpoint** (`https://publications.europa.eu/webapi/rdf/sparql`) for RDF triples, labels, and custom queries

[^1]: _Copyright 2026 European Union_
_Licensed under the EUPL, Version 1.2 or – as soon they will be approved by the European Commission – subsequent versions of the EUPL (the "Licence");_
_You may not use this work except in compliance with the Licence. You may obtain [a copy of the Licence here](LICENSE)._
_Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence._
