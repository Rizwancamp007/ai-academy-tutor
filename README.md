# AI Academy Tutor

A chatbot for academies. Teachers upload notes, past papers, and PDFs, and students ask questions and get answers grounded in that material, with source citations. If the answer isn't in the notes, it says so — it never makes up syllabus.

## How it works

1. A teacher uploads a PDF or Word file. The text is pulled out and split into overlapping chunks (~400 words, 50-word overlap).
2. Each chunk is embedded with Gemini (`text-embedding-004`) and stored in MongoDB next to its text.
3. A student asks a question. The question is embedded the same way, and cosine similarity picks the 5 most relevant chunks — no vector database needed at academy scale.
4. Gemini (`gemini-2.0-flash`) answers using only those chunks, and the reply comes back with citations (document name + part number) so a student can check the notes.
5. If the notes don't contain the answer, it says so instead of guessing.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB (users, documents, chunks, question stats)
- AI: Gemini API — embeddings + answers
- Auth: JWT, roles `teacher` / `student`
- File parsing: `pdf-parse` + `mammoth`

## Run it locally

You'll need Node 18+ and MongoDB (local or Atlas). Without a `MONGODB_URI` the server still runs, but data lives in memory and resets on restart.

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

The server runs on port 5000 by default, the client on 5173. Fill in the values in `server/.env` — never commit real keys. The client talks to the API at `VITE_API_URL` (defaults to `http://localhost:5000`).

### Environment variables (server)

| Variable | What it's for |
| --- | --- |
| `PORT` | Server port (default `5000`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign login tokens |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| `GEMINI_API_KEY` | Gemini key for embeddings + answers |
| `CLIENT_URL` | Frontend origin allowed by CORS |
| `MAX_UPLOAD_MB` | Upload size cap in MB (default `10`) |
| `DEMO_TEACHER_EMAIL` / `DEMO_TEACHER_PASSWORD` | Demo teacher account (seed only) |
| `DEMO_STUDENT_EMAIL` / `DEMO_STUDENT_PASSWORD` | Demo student account (seed only) |

## Demo accounts

Demo accounts are created from environment variables only — no demo credentials live in this repo. Set the `DEMO_*` values in `server/.env` (with `MONGODB_URI` set), then run:

```bash
cd server
npm run seed
```

Existing demo accounts are left alone, so running the seed twice is safe.

## Demo script

Try this with an academy owner:

1. Upload your physics notes (PDF or Word).
2. Ask: "Explain Newton's second law with an example."
3. The answer comes back quoted from your notes, with the source shown.
4. Ask something the notes don't cover — it tells you it's not in the material.

That's the whole pitch: your students get a 24/7 tutor that never teaches off-syllabus.

## API

- `POST /api/auth/register` — name, email, password (min 8 characters), role (`teacher` or `student`)
- `POST /api/auth/login` — email, password, returns a token and the user
- `GET /api/auth/me` — needs an `Authorization: Bearer <token>` header
- `POST /api/documents` — teacher only, upload a PDF or Word file (max 10 MB by default)
- `GET /api/documents` — list the library (teachers see their own uploads, students see all)
- `GET /api/documents/:id` — one document
- `DELETE /api/documents/:id` — teacher only, deletes the document and its chunks
- `POST /api/chat` — ask a question, returns the answer with citations (30 questions per minute per user)
- `GET /api/stats` — teacher only, totals, per-document questions, recent questions
- `GET /health` — `{"status":"ok"}`

## Tests

Run the tests from `server/`:

```bash
npm test
```

40 tests cover chunking and overlap, cosine ranking, citation formatting, the "not in the material" fallback, auth and role guards, upload validation, and the chat and error paths. Tests run without network calls.

## Deploy

Frontend goes to Vercel (static Vite build), backend to Render or Railway (Node service), database to MongoDB Atlas (free tier). Set the server env vars in the hosting dashboard — `GEMINI_API_KEY`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL` — and `VITE_API_URL` on the frontend so it points at the deployed API. Nothing secret lives in this repo.

## Project layout

```
client/   React + Vite frontend (chat UI, teacher dashboard)
server/   Express API (auth, documents, chat, stats)
server/src/services/   chunking, embeddings, retrieval, answers
server/src/routes/     auth, documents, chat, stats
server/tests/          unit + API tests
```
