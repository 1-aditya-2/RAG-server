import axios from 'axios'
let pipeline = null

const JINA_URL = 'https://api.jina.ai/v1/embeddings'
const MODEL_LOCAL = 'Xenova/all-MiniLM-L6-v2' // 384-dim

export async function embedTexts(texts) {
  if (process.env.JINA_API_KEY) {
    const { data } = await axios.post(JINA_URL, {
      input: texts,
      model: 'jina-embeddings-v3'
    }, {
      headers: { Authorization: `Bearer ${process.env.JINA_API_KEY}` }
    })
    return data.data.map(d => d.embedding)
  }
  // Fallback: local embeddings with @xenova/transformers
  if (!pipeline) {
    const { pipeline: pl } = await import('@xenova/transformers')
    pipeline = await pl('feature-extraction', MODEL_LOCAL)
  }
  const outs = []
  for (const t of texts) {
    const output = await pipeline(t, { pooling: 'mean', normalize: true })
    outs.push(Array.from(output.data))
  }
  return outs
}
