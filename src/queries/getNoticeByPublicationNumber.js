function query (publicationNumber) {

  // Unfortunately, identifiers sometimes start with 00, sometimes they don't.
  const normalized = publicationNumber.startsWith('00')
    ? publicationNumber
    : `00${publicationNumber}`

  return `
PREFIX epo: <http://data.europa.eu/a4g/ontology#>

CONSTRUCT {
  ?s ?p ?o
}
WHERE {
  graph ?g {
       ?s ?p ?o .
       ?notice epo:hasNoticePublicationNumber "${normalized}"
  }
}
`
}

export default query
