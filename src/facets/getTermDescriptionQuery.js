const simpleDescribe = (term) => `DESCRIBE <${term.value}>`

const describeWithPragma = (term) => `DEFINE sql:describe-mode "CBD"
DESCRIBE <${term.value}>`

const describeOneLevel = (term) => {
  return `
CONSTRUCT {
 <${term.value}> ?p ?o
}
WHERE {
    <${term.value}> ?p ?o 
}
`
}

const getNamedGraphHit = (term) => {

  return `
CONSTRUCT {
  ?s ?p ?o
}
WHERE {
  graph ?g {
    <${term.value}> ?p2 ?o2 .
    ?s ?p ?o .
  }
}
`
}

export {
  simpleDescribe,
  describeWithPragma,
  describeOneLevel,
  getNamedGraphHit,
}
