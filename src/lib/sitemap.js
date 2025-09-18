import axios from 'axios'
import xml2js from 'xml2js'
const { Parser: XMLParser } = xml2js

const INDEX_URL = 'https://www.reuters.com/arc/outboundfeeds/sitemap-index/?outputType=xml'

export async function fetchArticleURLs(limit=60) {
  const res = await axios.get(INDEX_URL, { timeout: 20000 })
  const parsed = await new Promise((resolve, reject) => {
    const parser = new XMLParser({ explicitArray: false })
    parser.parseString(res.data, (err, result) => err ? reject(err) : resolve(result))
  })
  const sitemaps = parsed.sitemapindex.sitemap
  const urls = []
  for (const sm of sitemaps.slice(0, 5)) { // first few sitemap files
    try {
      const smres = await axios.get(sm.loc, { timeout: 20000 })
      const pr = await new Promise((resolve, reject) => {
        const p = new XMLParser({ explicitArray: false })
        p.parseString(smres.data, (e, out) => e ? reject(e) : resolve(out))
      })
      const urlsInFile = (pr.urlset?.url || []).map(u => u.loc).filter(Boolean)
      urls.push(...urlsInFile)
      if (urls.length >= limit) break
    } catch {}
  }
  return urls.slice(0, limit)
}
