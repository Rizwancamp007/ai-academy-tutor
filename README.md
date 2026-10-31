# AI Academy Tutor

A chatbot for academies. Teachers upload notes, past papers, and PDFs, and students ask questions and get answers grounded in that material, with source citations. If the answer isn't in the notes, it says so.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB
- AI: Gemini API (embeddings + answers)

## Run it locally

Backend:

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Frontend:

```bash
cd client
npm install
npm run dev
```

The server runs on port 5000 by default, the client on 5173. Set the values in `server/.env` — never commit real keys.

## Project layout

```
client/   React + Vite frontend (chat UI, teacher dashboard)
server/   Express API (auth, documents, chat)
```
