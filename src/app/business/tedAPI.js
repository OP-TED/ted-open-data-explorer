import { normalize } from '../../facets/noticeQueries.js'

const apiURL = import.meta.env.VITE_TED_API

async function getRequest (procedureId) {
  const requestBody = {
    query: `procedure-identifier="${procedureId}"`,
    fields: [
      'publication-date',
      'notice-type',
      'form-type',
      'publication-number',
      'deadline-receipt-request',
      'procedure-identifier',
      'change-notice-version-identifier',
      'modification-previous-notice-identifier',
      'next-version',
      'links',
    ],
    limit: 100,
    sort: [{ 'field': 'publication-date', 'order': 'desc' }],
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
  const notices = tedResponse?.results || []
  const links = []

  notices.forEach(notice => {
    const links_data = notice.links || {}

    const pdfLink = links_data.pdf?.ENG || links_data.pdf?.FRA ||
      (links_data.pdf ? Object.values(links_data.pdf)[0] : null)
    const xmlLink = links_data.xml?.MUL
    const htmlLink = links_data.html?.ENG || links_data.html?.FRA ||
      (links_data.html ? Object.values(links_data.html)[0] : null)

    links.push({
      pdf: pdfLink,
      xml: xmlLink,
      html: htmlLink,
      nextVersion: notice['next-version'],
      changeNoticeVersionIdentifier: notice['change-notice-version-identifier'],
      publicationNumber: normalize(notice['publication-number']),
      publicationDate: notice['publication-date'],
      procedureId: notice['procedure-identifier'],
      noticeType: notice['notice-type'] || { value: 'Unknown' },
      formType: notice['form-type'] || { value: 'Unknown' },
    })
  })

  links.sort((a, b) => a.publicationNumber.localeCompare(b.publicationNumber))
  return links
}

export { getRequest, mapResponse }
