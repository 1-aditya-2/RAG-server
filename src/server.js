import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createClient as createQdrant } from './lib/qdrant.js'
import { redis } from './lib/redis.js'
import chatRouter from './routes/chat.js'

const app = express()
app.use(cors({ origin: '*'}))
app.use(express.json({ limit: '1mb' }))

// Health
app.get('/health', (_req, res) => res.json({ ok: true }))

// Routes
app.use('/api', chatRouter)

const PORT = process.env.PORT || 8787
app.listen(PORT, () => console.log(`API listening on :${PORT}`))
