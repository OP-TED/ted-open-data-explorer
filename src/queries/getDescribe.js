// function query (term) {
//   return `DEFINE sql:describe-mode "SCBD"
//
// DESCRIBE <${term.value}>
// `
// }

function query (term) {
  return `DESCRIBE <${term.value}>`
}
export default query
