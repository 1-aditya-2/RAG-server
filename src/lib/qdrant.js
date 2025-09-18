import { QdrantClient } from '@qdrant/js-client-rest'

const COLLECTION = process.env.COLLECTION_NAME || 'news_chunks'

export function createClient() {
  const url = process.env.QDRANT_URL || 'http://localhost:6333'
  const apiKey = process.env.QDRANT_API_KEY || undefined
  return new QdrantClient({ 
    url,
    apiKey,
    checkCompatibility: false 
  })
}

export async function ensureCollection(client, vectorSize=512) {
  const collections = await client.getCollections()
  const exists = collections.collections?.some(c => c.name === COLLECTION)
  
  // If collection exists, verify vector size
  if (exists) {
    const info = await client.getCollection(COLLECTION)
    const currentSize = info.config?.params?.vectors?.size
    if (currentSize !== vectorSize) {
      console.error(`Vector size mismatch! Collection has ${currentSize}-dim vectors but trying to use ${vectorSize}-dim vectors`)
      throw new Error(`Vector dimension mismatch: collection=${currentSize}, requested=${vectorSize}`)
    }
  } else {
    // Create new collection with specified vector size
    await client.createCollection(COLLECTION, {
      vectors: { size: vectorSize, distance: 'Cosine' },
      optimizers_config: { default_segment_number: 2 }
    })
    console.log(`Created collection ${COLLECTION} with ${vectorSize}-dim vectors`)
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
