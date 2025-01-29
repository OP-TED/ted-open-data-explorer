// A hack since we don't have CBD in place
// TODO: get something specific for the Ontology
function query (term) {
  return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

CONSTRUCT {
    ?resource ?p ?o .
    ?o ?p2 ?o2 .
    ?o2 ?p3 ?o3 .
    ?o3 ?p4 ?o4 .
    ?o4 ?p5 ?o5 .
    ?o5 ?p6 ?o6 .
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

                OPTIONAL {
                    ?o4 ?p5 ?o5 .
                    FILTER(isBlank(?o4))

                    OPTIONAL {
                        ?o5 ?p6 ?o6 .
                        FILTER(isBlank(?o5))
                    }
                }
            }
        }
    }
}
  `
}

export default query
