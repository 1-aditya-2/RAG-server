import 'dotenv/config'
import axios from 'axios'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import { nanoid } from 'nanoid'
import { createClient, ensureCollection, upsertChunks } from './lib/qdrant.js'
import { embedTexts } from './lib/embeddings.js'
import { chunkText } from './lib/chunk.js'
import { fetchArticleURLs } from './lib/sitemap.js'

const COLLECTION = process.env.COLLECTION_NAME || 'news_chunks'

async function extractArticle(url) {
  const res = await axios.get(url, { timeout: 20000 })
  const dom = new JSDOM(res.data, { url })
  const reader = new Readability(dom.window.document)
  const article = reader.parse()
  if (!article) return null
  return {
    url,
    title: article.title || 'Untitled',
    text: (article.textContent || '').trim()
  }
}

async function main() {
  const client = createClient()
  await ensureCollection(client, 1024) // Jina embeddings-v3 uses 1024-dim vectors
  const urls = await fetchArticleURLs(60)
  console.log('Fetched URLs:', urls.length)

  const articles = []
  for (const url of urls) {
    try {
      const a = await extractArticle(url)
      if (a && a.text && a.text.length > 500) articles.push(a)
      if (articles.length >= 50) break
    } catch {}
  }
  console.log('Will index articles:', articles.length)

  // Prepare chunks
  const points = []
  for (const a of articles) {
    const chunks = chunkText(a.text, 1000)
    const embeddings = await embedTexts(chunks)
    embeddings.forEach((vec, i) => {
      points.push({
        id: nanoid(),
        vector: vec,
        payload: {
          url: a.url,
          title: a.title,
          chunk_index: i,
          text: chunks[i]
        }
      })
    })
  }

  if (points.length) {
    await upsertChunks(client, points)
    console.log(`Upserted ${points.length} chunks to ${COLLECTION}`)
  } else {
    console.log('No points to upsert.')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
