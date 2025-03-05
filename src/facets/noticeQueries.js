function noticeByPublicationNumber (publicationNumber) {
  return `
PREFIX epo: <http://data.europa.eu/a4g/ontology#>

CONSTRUCT {
  ?s ?p ?o
}
WHERE {
  graph ?g {
       ?s ?p ?o .
       ?notice epo:hasNoticePublicationNumber "${publicationNumber}"
  }
}
`
}

export { noticeByPublicationNumber }
