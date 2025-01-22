import rdf from 'rdf-ext'
import ParserN3 from '@rdfjs/parser-n3'

const parserN3 = new ParserN3()


async function parseTurtle (strStream) {
  const quadStream = parserN3.import(strStream)
  const dataset = rdf.dataset()
  await dataset.import(quadStream)
  return dataset
}

export { parseTurtle }
