# Backend - RAG Chatbot

This is the **backend** of the RAG Chatbot project, built with **Node.js + Express** and integrated with **Qdrant** for vector search.

---

## 🚀 Features
- Exposes REST API for the chatbot
- Stores embeddings in Qdrant
- Supports semantic search for RAG pipeline
- Handles user sessions

---

## 📦 Tech Stack
- **Node.js**
- **Express.js**
- **Qdrant** (Vector Database)
- **Gemini API** (for embeddings + responses)
- **Dotenv** (environment config)

---

## 🔧 Setup Instructions

1. Clone the repo:
   ```bash
   git clone <your-repo-url>
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file in the backend directory:
   ```env
   PORT=5000
   GEMINI_API_KEY=your_openai_api_key
   QDRANT_URL=http://localhost:6333
   QDRANT_API_KEY=your_qdrant_api_key
   COLLECTION_NAME=chatbot_docs
   ```

4. Run server:
   ```bash
   npm start
   ```

5. Run in development with auto-reload:
   ```bash
   npm run dev
   ```

---

## 📂 Project Structure
```
backend/
 ├── src/
 │   ├── chat.js      # Main chatbot API
 │   ├── index.js     # Express server
 │   └── utils/
 ├── package.json
 └── .env
```

---

## 📡 API Endpoints
- **POST** `/api/chat` → Send user query and get AI response
- **GET** `/api/history/:sessionId` → Get past conversation
- **POST** `/api/reset` → Reset user session

---

## ⚡ Notes
- Make sure both frontend (`VITE_API_URL`) and backend (`PORT`) match.
- Ensure Qdrant is running before starting backend.
