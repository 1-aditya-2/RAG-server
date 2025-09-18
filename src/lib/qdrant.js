import { QdrantClient } from '@qdrant/js-client-rest'

const COLLECTION = process.env.COLLECTION_NAME || 'news_chunks'

export function createClient() {
  const url = process.env.QDRANT_URL || 'http://localhost:6333'
  const apiKey = process.env.QDRANT_API_KEY || undefined
  return new QdrantClient({ 
    url,
    apiKey 
  })
}

export async function ensureCollection(client, vectorSize=384) {
  const collections = await client.getCollections()
  const exists = collections.collections?.some(c => c.name === COLLECTION)
  if (!exists) {
    await client.createCollection(COLLECTION, {
      vectors: { size: vectorSize, distance: 'Cosine' },
      optimizers_config: { default_segment_number: 2 }
    })
  }
}

export async function upsertChunks(client, points) {
  return client.upsert(process.env.COLLECTION_NAME || 'news_chunks', { points })
}

export async function search(client, vector, topK=5) {
  return client.search(process.env.COLLECTION_NAME || 'news_chunks', {
    vector,
    limit: topK,
    with_payload: true,
    with_vector: false,
    score_threshold: parseFloat(process.env.MIN_SCORE || '0.2')
  })
}
