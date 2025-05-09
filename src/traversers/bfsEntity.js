import rdf from 'rdf-ext'

class Entity {
  constructor(term) {
    this.term = term
    this.types = []
    this.rows = []
  }
}

const unique = (arr) => [...rdf.termSet(arr)]

const rdfType = rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')

function bfsEntity(pointer, { visited, maxDepth }) {
  const entity = new Entity(pointer.term)
  entity.types = pointer.node(pointer.term).out(rdfType).terms

  const queue = [{ entity, depth: 0 }]

  while (queue.length > 0) {
    const { entity: currentEntity, depth } = queue.shift()
    const term = currentEntity.term

    if (visited.has(term)) {
      currentEntity.isInternalLink = true
      continue
    }

    visited.add(term)

    // Get outgoing quads for the current term
    const outgoingQuads = [...pointer.node(term).out().quads()]

    // Get unique outgoing predicates
    const outgoingPredicates = unique(outgoingQuads.map(x => x.predicate))

    for (const predicate of outgoingPredicates) {
      const terms = unique(pointer.node(term).out(predicate).terms)

      const row = { predicate, values: [] }

      for (const term of terms) {
        const childEntity = new Entity(term)

        childEntity.types = pointer.node(term).out(rdfType).terms
        row.values.push(childEntity)

        if (depth + 1 < maxDepth) {
          queue.push({ entity: childEntity, depth: depth + 1 })
        }
      }

      currentEntity.rows.push(row)
    }
  }

  return { entity, visited }
}

export { bfsEntity }
