import grapoi from 'grapoi'
import { normalize } from '../facets/noticeQueries.js'
import { ns } from '../namespaces.js'

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

  const procedureIds = guessProcedureIds(pointer)
  // Used to highlight occurrences in procedure navigation
  const publicationNumbers = guessPublicationNumbers(pointer).map(normalize)

  return {
    procedureIds: nodup(procedureIds),
    publicationNumbers: nodup(publicationNumbers),
  }
}

export { extractEntities }
