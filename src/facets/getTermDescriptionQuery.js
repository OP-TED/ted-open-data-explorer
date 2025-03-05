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

const describeHardcodedLevels = (term) => `
CONSTRUCT {
    ?resource ?p ?o .
    ?o ?p2 ?o2 .
    ?o2 ?p3 ?o3 .
}
WHERE {
    BIND(<${term.value}> AS ?resource)
    ?resource ?p ?o .

    OPTIONAL {
        ?o ?p2 ?o2 .
        FILTER(isBlank(?o))

        OPTIONAL {
            ?o2 ?p3 ?o3 .
            FILTER(isBlank(?o2))

            OPTIONAL {
                ?o3 ?p4 ?o4 .
                FILTER(isBlank(?o3))
            }
        }
    }
}`

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

export { simpleDescribe, describeHardcodedLevels, describeWithPragma, describeOneLevel, getNamedGraphHit}
