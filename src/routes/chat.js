import { GoogleGenerativeAI } from '@google/generative-ai'
import { nanoid } from 'nanoid'
import { createClient, search, ensureCollection } from '../lib/qdrant.js'
import { embedTexts } from '../lib/embeddings.js'
import { pushMessage, getHistory, clearHistory } from '../lib/redis.js'

import express from 'express'

const router = express.Router()
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
const client = createClient();

(async () => {
  try {
    await ensureCollection(client, 1024); // Jina embeddings-v3 uses 1024-dim vectors
    console.log("✅ Qdrant collection ensured:", process.env.COLLECTION_NAME || "news_chunks");
  } catch (err) {
    console.error("❌ Error ensuring collection:", err);
  }
})();

router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId: givenSession } = req.body || {}
    if (!message) return res.status(400).json({ error: 'message is required' })
    const sessionId = givenSession || nanoid()

    await pushMessage(sessionId, 'user', message)

    // Retrieve
    const [queryVec] = await embedTexts([message])
    const client = (await import('../lib/qdrant.js')).then ? (await import('../lib/qdrant.js')) : null
    const qdrant = client ? client : null

    const qc = (await import('../lib/qdrant.js')).createClient()
    const results = await search(qc, queryVec, parseInt(process.env.TOP_K || '5', 10))

    const contexts = results.map(r => ({
      title: r.payload.title,
      url: r.payload.url,
      text: r.payload.text
    }))

    const prompt = `You are a news assistant. Answer using ONLY these sources. Cite with [n] and list sources at the end.
Question: ${message}

Context:
${contexts.map((c,i)=>`[${i+1}] ${c.title} — ${c.url}\n${c.text.slice(0,1200)}`).join('\n\n')}

Answer:`

    const resp = await model.generateContent(prompt)
    const text = resp.response.text()

    await pushMessage(sessionId, 'assistant', text)

    res.json({
      sessionId,
      answer: text,
      citations: contexts.map((c,i)=>({ idx: i+1, title: c.title, url: c.url }))
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'internal_error', detail: String(e) })
  }
})

// SSE streaming (best effort)
router.get('/chat/stream', async (req, res) => {
  try {
    const q = req.query.q
    const sessionId = (req.query.sessionId || '').toString() || nanoid()
    if (!q) return res.status(400).end()

    await pushMessage(sessionId, 'user', q.toString())

    const [queryVec] = await embedTexts([q.toString()])
    const qc = (await import('../lib/qdrant.js')).createClient()
    const results = await search(qc, queryVec, parseInt(process.env.TOP_K || '5', 10))

    const contexts = results.map(r => ({
      title: r.payload.title,
      url: r.payload.url,
      text: r.payload.text
    }))

    const prompt = `You are a news assistant. Answer using ONLY these sources. Cite with [n] and list sources at the end.
Question: ${q}

Context:
${contexts.map((c,i)=>`[${i+1}] ${c.title} — ${c.url}\n${c.text.slice(0,1200)}`).join('\n\n')}

Answer:`

    const model = new (await import('@google/generative-ai')).GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ model: 'gemini-1.5-flash' })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const stream = await model.generateContentStream(prompt)

    let full = ''
    for await (const chunk of stream.stream) {
      const part = chunk.text()
      if (part) {
        full += part
        res.write(`data: ${JSON.stringify({ delta: part })}\n\n`)
      }
    }
    await pushMessage(sessionId, 'assistant', full)
    res.write(`data: ${JSON.stringify({
      done: true,
      sessionId: sessionId,
      citations: contexts.map((c, i) => ({
        idx: i + 1,
        title: c.title,
        url: c.url
      }))
    })}\n\n`)
    res.end()
  } catch (e) {
    try {
      res.write(`data: ${JSON.stringify({ error: e.toString() })}\n\n`)
    } catch {
      // Ignore error writing errors
    }
    res.end()
  }
})

// History
router.get('/history/:sessionId', async (req, res) => {
  const { sessionId } = req.params
  const hist = await getHistory(sessionId)
  res.json({ sessionId, history: hist })
})

// Reset
router.post('/reset/:sessionId', async (req, res) => {
  const { sessionId } = req.params
  const { clearHistory } = await import('../lib/redis.js')
  await clearHistory(sessionId)
  res.json({ ok: true })
})

export default router
