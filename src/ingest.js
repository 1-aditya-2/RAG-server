import 'dotenv/config'
import axios from 'axios'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import { v4 as uuidv4 } from 'uuid'
import { createClient, ensureCollection, upsertChunks } from './lib/qdrant.js'
import { embedTexts } from './lib/embeddings.js'
import { chunkText } from './lib/chunk.js'
import { fetchArticleURLs } from './lib/sitemap.js'

const COLLECTION = process.env.COLLECTION_NAME || 'news_chunks'

async function extractArticle(url) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0'
  }
  
  try {
    console.log('Fetching article:', url);
    const res = await axios.get(url, { 
      timeout: 20000,
      headers,
      maxRedirects: 5
    })
    console.log('Article fetched, parsing content...');
    const dom = new JSDOM(res.data, { url })
    const reader = new Readability(dom.window.document)
    const article = reader.parse()
    if (!article) {
      console.log('Failed to parse article content');
      return null;
    }
    console.log('Article parsed successfully');
    return {
      url,
      title: article.title || 'Untitled',
      text: (article.textContent || '').trim()
    }
  } catch (error) {
    console.error('Error fetching article:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    throw error;
  }
}

async function main() {
  try {
    console.log('Starting ingestion process...');
    const client = createClient()
    await ensureCollection(client, 1024) // Jina embeddings-v3 uses 1024-dim vectors
    console.log('Fetching article URLs...');
    const urls = await fetchArticleURLs(60)
    console.log('Fetched URLs:', urls.length, urls[0]);

    const articles = []
    console.log('Starting to extract articles...');
    for (const url of urls) {
      try {
        console.log('Extracting article from:', url);
        const a = await extractArticle(url)
        if (a && a.text && a.text.length > 500) {
          articles.push(a)
          console.log('Successfully extracted article:', a.title);
        }
        if (articles.length >= 50) break
      } catch (err) {
        console.error('Failed to extract article:', url, err.message);
      }
    }
    console.log('Will index articles:', articles.length)

    // Prepare chunks
    console.log('Starting to create and embed chunks...');
    const points = []
    for (const a of articles) {
      try {
        console.log('Processing article:', a.title);
        const chunks = chunkText(a.text, 1000)
        console.log(`Created ${chunks.length} chunks for article`);
        const embeddings = await embedTexts(chunks)
        console.log(`Generated ${embeddings.length} embeddings`);
        embeddings.forEach((vec, i) => {
          points.push({
            id: uuidv4(),
            vector: vec,
            payload: {
              url: a.url,
              title: a.title,
              chunk_index: i,
              text: chunks[i]
            }
          })
        })
      } catch (err) {
        console.error('Failed to process article:', a.title, err.message);
      }
    }

    if (points.length) {
      console.log(`Attempting to upsert ${points.length} points...`);
      await upsertChunks(client, points)
      console.log(`Successfully upserted ${points.length} chunks to collection`);
    } else {
      console.log('No points to upsert.');
    }
  } catch (err) {
    console.error('Main process failed:', err);
    throw err;
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1)
});
