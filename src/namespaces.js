import rdf from 'rdf-ext'

const ns = {
  schema: rdf.namespace('http://schema.org/'),
  rdf: rdf.namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
  xsd: rdf.namespace('http://www.w3.org/2001/XMLSchema#'),
  rdfs: rdf.namespace('http://www.w3.org/2000/01/rdf-schema#'),
  owl: rdf.namespace('http://www.w3.org/2002/07/owl#'),
  skos: rdf.namespace('http://www.w3.org/2004/02/skos/core#'),
  dcterms: rdf.namespace('http://purl.org/dc/terms/'),
  dct: rdf.namespace('http://purl.org/dc/terms/'),
  foaf: rdf.namespace('http://xmlns.com/foaf/0.1/'),
  m8g: rdf.namespace('http://data.europa.eu/m8g/'),
  sfrml: rdf.namespace('http://data.europa.eu/a4g/mapping/sf-rml/'),
  epo: rdf.namespace('http://data.europa.eu/a4g/ontology#'),
  eli: rdf.namespace('http://data.europa.eu/eli/ontology#'),
  time: rdf.namespace('http://www.w3.org/2006/time#'),
  person: rdf.namespace('http://www.w3.org/ns/person#'),
  locn: rdf.namespace('http://www.w3.org/ns/locn#'),
  shacl: rdf.namespace('http://www.w3.org/ns/shacl#'),
  org: rdf.namespace('http://www.w3.org/ns/org#'),
  adms: rdf.namespace('http://www.w3.org/ns/adms#'),
  rml: rdf.namespace('http://semweb.mmlab.be/ns/rml#'),
  r2rml: rdf.namespace('http://www.w3.org/ns/r2rml#'),
  sh: rdf.namespace('http://www.w3.org/ns/shacl#'),
  epo_shape: rdf.namespace('http://data.europa.eu/a4g/data-shape#'),
}

export {
  ns,
}
