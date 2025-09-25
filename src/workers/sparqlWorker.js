// Worker message handler
self.onmessage = async function(event) {
  const { id, type, query, endpoint } = event.data

  if (type !== 'sparql') {
    self.postMessage({
      id,
      type: 'error',
      error: 'Unknown message type'
    })
    return
  }

  try {
    const turtleData = await doSPARQLRaw(query, endpoint)

    self.postMessage({
      id,
      type: 'success',
      turtleData
    })
  } catch (error) {
    self.postMessage({
      id,
      type: 'error',
      error: error.message
    })
  }
}

async function doSPARQLRaw(query, endpoint) {
  const headers = new Headers({
    Accept: 'text/turtle',
    'Content-Type': 'application/x-www-form-urlencoded',
  })

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: headers,
    body: new URLSearchParams({ query }).toString(),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text)
  }

  return await response.text()
}