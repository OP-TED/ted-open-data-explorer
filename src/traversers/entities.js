import grapoi from 'grapoi'
import rdf from 'rdf-ext'
import { bfsEntity } from './bfsEntity.js'

const all = { subject: undefined, predicate: undefined, object: undefined }

// Gets the roots of all entities.
//
// matchers: array of matchers of the type {s,p,o}, where {} is all triples
// ignoreNamedGraphs: trims namedGraphs from the dataset
function getEntities (dataset, options) {

  const { matchers, ignoreNamedGraphs, maxDepth } = {
    matchers: [all],
    ignoreNamedGraphs: true,
    maxDepth: Infinity,
    ...options,
  }

  const result = []

  let visited = rdf.termSet()

  const d = ignoreNamedGraphs ? dataset.map(
    quad => rdf.quad(quad.subject, quad.predicate, quad.object)) : dataset

  for (const { subject, predicate, object } of matchers) {
    const batch = [...d.match(subject, predicate, object)].map(
      x => x.subject).filter(x => !visited.has(x))

    const batchResult = batch.reduce((acc, term) => {

      if (acc.visited.has(term)) {
        // If it was visited, ignore it from batch
        return { entities: acc.entities, visited: acc.visited }
      }

      const pointer = grapoi({ dataset: d, term, factory: rdf })

      // if (pointer.in().term) {
      //   // If there is another triple pointing to it, ignore it from batch
      //   return { entities: acc.entities, visited: acc.visited }
      // }

      const { entity, visited } = bfsEntity(pointer, {
        maxDepth,
        visited:acc.visited,
      })
      return {
        entities: acc.entities.concat(entity),
        visited,
      }
    }, { entities: [], visited })

    result.push(...batchResult.entities)
    visited = batchResult.visited
  }

  return result
}

export { getEntities }
