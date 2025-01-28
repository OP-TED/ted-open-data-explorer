function query (term) {

  return `
CONSTRUCT {
 <${term.value}> ?p ?o
}
WHERE {
    <${term.value}> ?p ?o 
}
`
}

export default query
