import rdf from 'rdf-ext'

class Entity {
  constructor(term) {
    this.term = term
    this.types = []
    this.rows = []
  }
}

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
    const predicates = [
      ...rdf.termSet(
        [...pointer.node(term).out().quads()].map(x => x.predicate)
      ),
    ]

    for (const predicate of predicates) {
      const values = pointer.node(term).out(predicate)

      const row = { predicate, values: [] }

      for (const value of values) {
        const childEntity = new Entity(value.term)

        childEntity.types = pointer.node(value.term).out(rdfType).terms
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
