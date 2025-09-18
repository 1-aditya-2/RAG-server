import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createClient as createQdrant } from './lib/qdrant.js'
import { redis } from './lib/redis.js'
import chatRouter from './routes/chat.js'

const app = express()
// Configure CORS to only allow requests from our frontend
app.use(cors({ 
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://rag-server-1-gd8d.onrender.com', 'https://rag-client1.onrender.com/']
    : 'http://localhost:5173'
}))
app.use(express.json({ limit: '1mb' }))

// Health
app.get('/health', (_req, res) => res.json({ ok: true }))

// Routes
app.use('/api', chatRouter)

const PORT = process.env.PORT || 8787
app.listen(PORT, () => console.log(`API listening on :${PORT}`))
