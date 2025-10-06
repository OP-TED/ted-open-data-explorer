# TED Open Data Explorer

A Vue.js web application for exploring European Union public procurement data from the EU Publications Office.

The application can be seen [here](https://docs.ted.europa.eu/ted-open-data-explorer/)

## What's Included

- RDF Notice Display: Shows RDF notices from Cellar in the form of a tree.
- Concept Navigation: Browse and explore all RDF concepts beyond just notices.
- Procedure Information: For notices, displays associated procurement procedures.
- Backlinks: Shows backlinks and relationships for named nodes
- Label Display: Renders human-readable labels for RDF resources when possible

## Repository Structure

- `src/app/` - Vue 3 application components and business logic
- `src/services/` - SPARQL query execution services
- `src/facets/` - Faceted search functionality and query builders
- `src/composables/` - Vue composition functions
- `test/` - Test suite with Mocha and snapshot testing
- `public/` - Static assets

## How to Run

### Prerequisites

- Node.js (latest LTS or newer)
- npm (comes with Node.js)

### Set up SPARQL endpoint

- Development environment
  - Update the SPARQL endpoint in [vite.config.js](vite.config.js) file
- Production environment
  - Update the SPARQL endpoint in [.env.production](.env.production) file

### Run in Development Mode

```bash
npm install
npm run dev
```

The app will start at http://localhost:5173 with hot reload and SPARQL proxy enabled.

### Build for Production

```bash
npm run build
```

Generates a production-ready build in the `dist/` directory.

## Technology Stack

- Vue 3 with Composition API
- Vite build system
- Naive UI components
- CodeMirror 6 for SPARQL editing
- rdf-ext and grapoi for RDF data handling
- Pinia for state management

## Data Source

Queries EU Publications Office SPARQL endpoint at https://publications.europa.eu/webapi/rdf/sparql for public
procurement data.
