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

function normalize (publicationNumber) {
  const [number, year] = publicationNumber.split('-')
  const paddedNumber = number.padStart(8, '0')
  return `${paddedNumber}-${year}`
}

function createPublicationNumberFacet (publicationNumber) {
  if (publicationNumber.trim) {
    return {
      type: 'notice-number',
      value: normalize(publicationNumber),
    }
  }
}

export { normalize, noticeByPublicationNumber, createPublicationNumberFacet }
