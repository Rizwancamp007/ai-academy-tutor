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

## Auth

Register and log in with a teacher or student role. Passwords are hashed, and every protected route checks the JWT and the role on the server, not just in the UI.

- `POST /api/auth/register` — name, email, password (min 8 characters), role (`teacher` or `student`)
- `POST /api/auth/login` — email, password, returns a token and the user
- `GET /api/auth/me` — needs an `Authorization: Bearer <token>` header

## Teacher dashboard

Teachers get a dashboard with their uploads, the document library, and stats: how many questions students asked, how many the notes could answer, and which documents the answers came from, plus recent questions about their notes.

- `GET /api/stats` — teacher only, needs an `Authorization: Bearer <token>` header

Run the tests from `server/`:

```bash
npm test
```

## Demo accounts

Demo accounts are created from environment variables only, never from values in the repo. Set `DEMO_TEACHER_EMAIL`, `DEMO_TEACHER_PASSWORD`, `DEMO_STUDENT_EMAIL`, and `DEMO_STUDENT_PASSWORD` in `server/.env` (with `MONGODB_URI` set), then run:

```bash
cd server
npm run seed
```

Existing demo accounts are left alone, so running the seed twice is safe.

## Project layout

```
client/   React + Vite frontend (chat UI, teacher dashboard)
server/   Express API (auth, documents, chat)
```
