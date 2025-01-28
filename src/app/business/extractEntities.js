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

const nodup = (arr) => [...new Set(arr)]

function extractEntities ({ dataset }) {
  const pointer = grapoi({ dataset })
  return {
    procedureIds: nodup(guessProcedureIds(pointer)),
    publicationNumbers: nodup(guessPublicationNumbers(pointer)),
  }
}

export { extractEntities }
