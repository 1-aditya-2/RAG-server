import { createClient, ensureCollection } from './lib/qdrant.js'

async function initQdrant() {
  try {
    const client = createClient()
    await ensureCollection(client, 384) // MiniLM-L12-v2 uses 384-dim vectors
    console.log('Successfully initialized Qdrant collection')
    process.exit(0)
  } catch (err) {
    console.error('Failed to initialize Qdrant:', err)
    process.exit(1)
  }
}

initQdrant()