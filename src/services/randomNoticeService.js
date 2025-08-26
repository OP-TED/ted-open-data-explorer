import { doSPARQL } from './doQuery.js'

/**
 * Generate a random date string in YYYY-MM-DD format within the last 60 days
 */
function getRandomRecentDate() {
  const today = new Date()
  const daysAgo = Math.floor(Math.random() * 60) // Random day in last 60 days
  const randomDate = new Date(today.getTime() - (daysAgo * 24 * 60 * 60 * 1000))
  return randomDate.toISOString().split('T')[0]
}

/**
 * Format date string to next day for date range query
 */
function getNextDay(dateString) {
  const date = new Date(dateString)
  date.setDate(date.getDate() + 1)
  return date.toISOString().split('T')[0]
}

/**
 * Query for random publication number within a date range using CONSTRUCT instead of SELECT
 */
async function queryRandomNoticeByDateRange(startDate, endDate) {
  const query = `
    PREFIX epo: <http://data.europa.eu/a4g/ontology#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    CONSTRUCT {
      ?notice epo:hasNoticePublicationNumber ?publicationNumber .
    }
    WHERE {
      ?notice a epo:Notice ;
              epo:hasNoticePublicationNumber ?publicationNumber ;
              epo:hasPublicationDate ?publicationDate .

      FILTER (?publicationDate >= "${startDate}"^^xsd:date &&
              ?publicationDate <  "${endDate}"^^xsd:date)
    }
    LIMIT 1
  `

  try {
    const dataset = await doSPARQL(query)
    
    // Extract publication number from RDF dataset
    for (const quad of dataset) {
      if (quad.predicate.value.includes('hasNoticePublicationNumber')) {
        return quad.object.value
      }
    }
    return null
  } catch (error) {
    console.warn(`Failed to query notices for date range ${startDate} to ${endDate}:`, error)
    return null
  }
}

/**
 * Get a random publication number with fallback logic for weekends/holidays
 * Tries progressively larger date ranges until a result is found
 */
export async function getRandomPublicationNumber() {
  const maxAttempts = 10
  let dayRange = 1 // Start with 1-day range
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const startDate = getRandomRecentDate()
    const endDate = getNextDay(startDate)
    
    // For attempts after the first, expand the range
    if (attempt > 0) {
      const expandedStart = new Date(startDate)
      expandedStart.setDate(expandedStart.getDate() - dayRange)
      const expandedEnd = new Date(startDate)
      expandedEnd.setDate(expandedEnd.getDate() + dayRange)
      
      const publicationNumber = await queryRandomNoticeByDateRange(
        expandedStart.toISOString().split('T')[0],
        expandedEnd.toISOString().split('T')[0]
      )
      
      if (publicationNumber) {
        return publicationNumber
      }
      
      dayRange = Math.min(dayRange * 2, 14) // Double range, max 2 weeks
    } else {
      // First attempt: try the original 1-day range
      const publicationNumber = await queryRandomNoticeByDateRange(startDate, endDate)
      if (publicationNumber) {
        return publicationNumber
      }
    }
  }
  
  // Ultimate fallback: return a known working publication number
  console.warn('Could not find random publication number after multiple attempts')
  return '00170151-2024' // Fallback to first ID from original examples
}