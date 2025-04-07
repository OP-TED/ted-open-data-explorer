import { readFileSync } from 'fs'
import { Parser } from 'n3'
import rdf from 'rdf-ext'

function readTurtle (path) {
  const parser = new Parser()
  const turtleStr = readFileSync(path,
    { encoding: 'utf-8' })
  return rdf.dataset([...parser.parse(turtleStr)])
}

function getRabbitDataset () {
  return readTurtle('test/support/rabbit.trig')

}

export { getRabbitDataset }
