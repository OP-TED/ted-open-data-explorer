import grapoi from 'grapoi'
import { ns } from '../../namespaces.js'

function guessProcedureId ({ dataset }) {
  const pointer = grapoi({ dataset })

  return pointer.out(ns.epo.refersToProcedure).
    out(ns.adms.identifier).
    out(ns.skos.notation).values
}

function doProxy (url) {
  const proxyUrl = 'https://corsproxy.io/?'
  const targetUrl = encodeURIComponent(
    url)
  return `${proxyUrl}${targetUrl}`
}

function getTedAPIUrls ({ dataset }) {
  const apiURL = (id) => `https://api.ted.europa.eu/private-search/api/v1/notices/family/${id}?language=EN&fields=publication-date&fields=notice-type&fields=publication-number&fields=deadline-receipt-request&fields=procedure-identifier&fields=change-notice-version-identifier&fields=modification-previous-notice-identifier&fields=previous-planning-identifier-part-lot&fields=previous-planning-identifier-part-part&sort=publication-date,desc`
  return guessProcedureId({ dataset }).map(apiURL)
}

function getProcedureTedLinks ({ dataset }) {
  return getTedAPIUrls({ dataset }).map(doProxy)
}

function mapResponse (tedResponse) {

  const notices = tedResponse['notices'] || []
  const links = []
  notices.forEach(notice => {
    const pdfLink = notice.links.pdf['ENG'] || notice.links.pdf['FRA'] ||
      Object.values(notice.links.pdf)[0]
    const xmlLink = notice.links.xml['MUL']
    const htmlLink = notice.links.html['ENG'] || notice.links.html['FRA'] ||
      Object.values(notice.links.html)[0]

    links.push({
      pdf: pdfLink,
      xml: xmlLink,
      html: htmlLink,
      publicationNumber: notice['publication-number'],
      publicationDate: notice['publication-date'],
      procedureId: notice['procedure-identifier'],
    })
  })
  return links

}

export { getProcedureTedLinks, mapResponse }
