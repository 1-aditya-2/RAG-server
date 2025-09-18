import Redis from 'ioredis'

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export async function pushMessage(sessionId, role, content) {
  const key = `session:${sessionId}:messages`
  await redis.rpush(key, JSON.stringify({ role, content, ts: Date.now() }))
  const ttl = parseInt(process.env.SESSION_TTL_SECONDS || '86400', 10)
  if (ttl > 0) await redis.expire(key, ttl)
}

export async function getHistory(sessionId) {
  const key = `session:${sessionId}:messages`
  const vals = await redis.lrange(key, 0, -1)
  return vals.map(v => JSON.parse(v))
}

export async function clearHistory(sessionId) {
  const key = `session:${sessionId}:messages`
  await redis.del(key)
}
