import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createClient as createQdrant } from './lib/qdrant.js'
import { redis } from './lib/redis.js'
import chatRouter from './routes/chat.js'

const app = express()
app.use(cors({
  origin: [
    'https://rag-client1.onrender.com',
    'https://rag-news-voosh.onrender.com',
    'http://localhost:5173', // Local development
    'http://localhost:4173'  // Local preview
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}))
app.use(express.json({ limit: '1mb' }))

// Health
app.get('/health', (_req, res) => res.json({ ok: true }))

// Routes
app.use('/api', chatRouter)

const PORT = process.env.PORT || 8787
app.listen(PORT, () => console.log(`API listening on :${PORT}`))
