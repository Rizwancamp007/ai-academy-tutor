import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { generateAnswer } from "../services/answer.js";
import { embedText } from "../services/embed.js";
import { formatCitation, rankChunks } from "../services/retrieve.js";

// Ask a question, get an answer grounded in the uploaded notes, with
// citations. Any logged-in user can ask; teachers and students both use
// the same chat. A light per-user rate limit keeps one account from
// hammering the model endpoint.
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_REQUESTS = 30;

export function createChatRouter({
  chunkStore,
  docStore,
  embedQuestion = embedText,
  generate = generateAnswer,
} = {}) {
  if (!chunkStore) throw new Error("A chunk store is required");
  if (!docStore) throw new Error("A document store is required");
  const router = express.Router();
  const recentByUser = new Map();

  router.post("/", requireAuth, async (req, res) => {
    const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
    if (!question) {
      return res.status(400).json({ message: "Ask a question first" });
    }
    const now = Date.now();
    const recent = (recentByUser.get(req.user.id) || []).filter((t) => now - t < RATE_WINDOW_MS);
    if (recent.length >= RATE_MAX_REQUESTS) {
      return res.status(429).json({ message: "Too many questions — wait a minute and try again" });
    }
    recent.push(now);
    recentByUser.set(req.user.id, recent);
    try {
      const queryEmbedding = await embedQuestion(question);
      const chunks = await chunkStore.listAll();
      const top = rankChunks(chunks, queryEmbedding);
      const sources = [];
      for (const chunk of top) {
        const doc = await docStore.findById(chunk.documentId);
        sources.push({
          documentId: String(chunk.documentId),
          documentTitle: doc ? doc.title : null,
          index: chunk.index,
          text: chunk.text,
          score: chunk.score,
        });
      }
      const answer = await generate(question, sources);
      const citations = sources.map((source) => ({
        documentId: source.documentId,
        documentTitle: source.documentTitle,
        index: source.index,
        citation: formatCitation(source),
      }));
      return res.json({ answer, citations });
    } catch (err) {
      if (err && /GEMINI_API_KEY is not set/.test(err.message)) {
        return res.status(500).json({ message: "Answering is not configured yet" });
      }
      return res.status(502).json({ message: "Could not answer right now — please try again" });
    }
  });

  return router;
}
