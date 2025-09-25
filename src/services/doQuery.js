import rdf from 'rdf-ext'
import { Parser } from 'n3'

const sparqlEndpoint = import.meta.env.VITE_SPARQL_ENDPOINT
let worker = null
let messageIdCounter = 0
const pendingRequests = new Map()

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('../workers/sparqlWorker.js', import.meta.url), {
      type: 'module'
    })
    
    worker.onmessage = function(event) {
      const { id, type, turtleData, error } = event.data
      const resolve = pendingRequests.get(id)?.resolve
      const reject = pendingRequests.get(id)?.reject

      pendingRequests.delete(id)

      if (type === 'success' && resolve) {
        // Parse turtle data in main thread where rdf-ext works
        try {
          const parser = new Parser({ format: 'text/turtle' })
          const dataset = rdf.dataset([...parser.parse(turtleData)])
          resolve(dataset)
        } catch (parseError) {
          reject(new Error(`Failed to parse SPARQL response: ${parseError.message}`))
        }
      } else if (type === 'error' && reject) {
        reject(new Error(error))
      }
    }
    
    worker.onerror = function(error) {
      console.error('SPARQL Worker error:', error)
    }
  }
  return worker
}

export async function doSPARQL(query) {
  return new Promise((resolve, reject) => {
    const id = ++messageIdCounter
    const workerInstance = getWorker()
    
    pendingRequests.set(id, { resolve, reject })
    
    workerInstance.postMessage({
      id,
      type: 'sparql',
      query,
      endpoint: sparqlEndpoint
    })
    })
}
