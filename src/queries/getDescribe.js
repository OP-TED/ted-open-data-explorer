function query (term) {
  return `DESCRIBE <${term.value}>`
}

export default query
