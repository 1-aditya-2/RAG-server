import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const FALLBACK_MODEL = 'gemini-1.5-pro';
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry(fn, retries = MAX_RETRIES, delay = BASE_DELAY) {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0 || !isRetryableError(error)) throw error;
    
    console.log(`Retrying after ${delay}ms... (${retries} attempts left)`);
    await sleep(delay);
    return withRetry(fn, retries - 1, delay * 2);
  }
}

function isRetryableError(error) {
  // Retry on 429 (Rate Limit) or 503 (Service Unavailable)
  return error?.status === 429 || error?.status === 503;
}

export async function generateResponse(prompt, { stream = false } = {}) {
  // First try with gemini-1.5-flash
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    if (stream) {
      return await withRetry(() => model.generateContentStream(prompt));
    }
    const result = await withRetry(() => model.generateContent(prompt));
    return result;
  } catch (error) {
    console.log('Falling back to gemini-1.0-pro due to error:', error.message);
    
    // Fallback to gemini-1.0-pro
    const fallbackModel = genAI.getGenerativeModel({ model: FALLBACK_MODEL });
    if (stream) {
      return await withRetry(() => fallbackModel.generateContentStream(prompt));
    }
    const result = await withRetry(() => fallbackModel.generateContent(prompt));
    return result;
  }
}
