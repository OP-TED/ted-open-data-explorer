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
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 8080;

const SPARQL_ENDPOINT = 'https://publications.europa.eu/webapi/rdf/sparql';

app.use(cors());
app.use(express.static(path.join(__dirname, '..')));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.all('/sparql', async (req, res) => {
  try {
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': req.headers.accept || 'text/turtle',
    };

    // Re-encode the parsed body back to URL-encoded form
    const body = req.method === 'POST'
      ? new URLSearchParams(req.body).toString()
      : undefined;
    const url = req.method === 'GET'
      ? `${SPARQL_ENDPOINT}?${new URLSearchParams(req.query)}`
      : SPARQL_ENDPOINT;

    const response = await fetch(url, {
      method: req.method === 'GET' ? 'GET' : 'POST',
      headers,
      body,
    });

    const text = await response.text();
    res.set('Content-Type', response.headers.get('Content-Type') || 'text/turtle');
    res.status(response.status).send(text);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.listen(PORT, () => {
  console.log(`Dev server at http://localhost:${PORT}`);
  console.log(`SPARQL proxy at http://localhost:${PORT}/sparql`);
});
