import { normalize } from '../facets/noticeQueries.js'

const apiURL = import.meta.env.VITE_TED_API

async function getRequest (procedureId) {
  const requestBody = {
    query: `procedure-identifier="${procedureId}"`,
    scope: 'ALL',
    fields: [
      'notice-type',
      'publication-date',
      'notice-version',
      'form-type',
      'publication-number',
      'links',
    ],
    limit: 249,
  }

  // Return the request configuration for useFetch to handle
  return {
    url: `${apiURL}/notices/search`,
    options: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    },
  }
}

function mapResponse (tedResponse) {
  const notices = tedResponse?.notices || []
  const result = []

  notices.forEach(notice => {
    const links_data = notice.links || {}

    const pdfLink = links_data.pdf?.ENG || links_data.pdf?.FRA ||
      (links_data.pdf ? Object.values(links_data.pdf)[0] : null)
    const xmlLink = links_data.xml?.MUL
    const htmlLink = links_data.html?.ENG || links_data.html?.FRA ||
      (links_data.html ? Object.values(links_data.html)[0] : null)

    result.push({
      pdf: pdfLink,
      xml: xmlLink,
      html: htmlLink,
      noticeVersion: notice['notice-version'],
      publicationNumber: normalize(notice['publication-number']),
      publicationDate: notice['publication-date'],
      noticeType: notice['notice-type'] || { value: 'Unknown' },
      formType: notice['form-type'] || { value: 'Unknown' },
    })
  })

  result.sort((a, b) => {
    const dateA = new Date(a.publicationDate)
    const dateB = new Date(b.publicationDate)

    // Handle invalid dates
    if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
      return 0
    }

    return dateB - dateA // Most recent first
  })
  return result
}

async function getNoticeByPublicationNumber (publicationNumber) {
  const requestBody = {
    query: `publication-number="${publicationNumber}"`,
    scope: 'ALL',
    fields: [
      'publication-number',
      'publication-date',
      'buyer-country',
      'customization-id',
      'procedure-identifier',
    ],
    limit: 10,
  }

  // Return the request configuration for useFetch to handle
  return {
    url: `${apiURL}/notices/search`,
    options: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    },
  }
}

function extractProcedureIds (tedResponse) {
  const notices = tedResponse?.notices || []
  const procedureIds = new Set()

  notices.forEach(notice => {
    const procedureId = notice['procedure-identifier']
    if (procedureId) {
      procedureIds.add(procedureId)
    }
  })

  return Array.from(procedureIds)
}

export { getRequest, mapResponse, getNoticeByPublicationNumber, extractProcedureIds }
