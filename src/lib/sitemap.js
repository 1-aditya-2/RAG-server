import axios from 'axios'
import xml2js from 'xml2js'
const { Parser: XMLParser } = xml2js

const INDEX_URL = 'https://www.reuters.com/arc/outboundfeeds/sitemap-index/?outputType=xml'

export async function fetchArticleURLs(limit=60) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  }

  try {
    console.log('Fetching sitemap index...');
    const res = await axios.get(INDEX_URL, { 
      timeout: 30000,
      headers,
      maxRedirects: 5
    })
    
    const parsed = await new Promise((resolve, reject) => {
      const parser = new XMLParser({ explicitArray: false })
      parser.parseString(res.data, (err, result) => err ? reject(err) : resolve(result))
    })
    
    if (!parsed.sitemapindex?.sitemap) {
      console.error('No sitemaps found in index');
      return [];
    }

    const sitemaps = Array.isArray(parsed.sitemapindex.sitemap) 
      ? parsed.sitemapindex.sitemap 
      : [parsed.sitemapindex.sitemap];

    console.log(`Found ${sitemaps.length} sitemaps`);
    const urls = [];
    
    for (const sm of sitemaps.slice(0, 5)) {
      try {
        console.log('Fetching sitemap:', sm.loc);
        const smres = await axios.get(sm.loc, { 
          timeout: 30000,
          headers,
          maxRedirects: 5
        })
        
        const pr = await new Promise((resolve, reject) => {
          const p = new XMLParser({ explicitArray: false })
          p.parseString(smres.data, (e, out) => e ? reject(e) : resolve(out))
        })
        
        const urlsInFile = Array.isArray(pr.urlset?.url) 
          ? pr.urlset.url.map(u => u.loc).filter(Boolean)
          : (pr.urlset?.url?.loc ? [pr.urlset.url.loc] : []);

        console.log(`Found ${urlsInFile.length} URLs in sitemap`);
        urls.push(...urlsInFile);
        
        if (urls.length >= limit) break;
      } catch (error) {
        console.error('Error fetching sitemap:', error.message);
      }
    }
    
    console.log(`Total URLs found: ${urls.length}`);
    return urls.slice(0, limit);
  } catch (error) {
    console.error('Error fetching sitemap index:', error.message);
    return [];
  }
}
