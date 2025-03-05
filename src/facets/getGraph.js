function query (namedGraph) {

  return `
CONSTRUCT {
  ?s ?p ?o
}
WHERE {
  graph <${namedGraph}> {
       ?s ?p ?o
  }
}
`
}

export default query
