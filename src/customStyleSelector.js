import { ns } from './namespaces.js'

function cssClassifier (row, context = {}) {
  if (row.predicate?.value === ns.rdf.type.value) {
    return 'rdf_type'
  }

  if (row.predicate?.value === ns.epo.specifiesProcurementCriterion.value) {
    return 'vertical'
  }

  if (row.predicate?.value === ns.epo.usesTechnique.value) {
    return 'vertical'
  }

  if (row.predicate?.value === ns.adms.identifier.value) {
    return 'rounded'
  }

  if (row.predicate?.value === ns.epo.isSubjectToLotSpecificTerm.value) {
    return 'rounded'
  }

  return null

}

export { cssClassifier }
