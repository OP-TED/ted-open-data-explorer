import grapoi from 'grapoi'
import { ns } from '../../namespaces.js'

function guessProcedureIds (pointer) {
  return pointer.out(ns.epo.refersToProcedure).
    out(ns.adms.identifier).
    out(ns.skos.notation).values
}

function guessPublicationNumbers (pointer) {
  return pointer.out(ns.epo.hasNoticePublicationNumber).values
}

function extractEntities ({ dataset }) {
  const pointer = grapoi({ dataset })
  return {
    procedureIds: guessProcedureIds(pointer),
    publicationNumbers: guessPublicationNumbers(pointer),
  }
}

export { extractEntities }
