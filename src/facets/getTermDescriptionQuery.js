const describeWithPragma = (term) => `DEFINE sql:describe-mode "CBD"
DESCRIBE <${term.value}>`

export {
  describeWithPragma,
}
