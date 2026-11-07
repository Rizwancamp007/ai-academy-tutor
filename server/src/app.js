import cors from "cors";
import express from "express";
import { createAuthRouter } from "./routes/auth.js";
import { createChatRouter } from "./routes/chat.js";
import { createDocumentsRouter, uploadErrorHandler } from "./routes/documents.js";
import { createStatsRouter } from "./routes/stats.js";
import { createMemoryChunkStore } from "./store/chunks.js";
import { createMemoryDocumentStore } from "./store/documents.js";
import { createMemoryStatsStore } from "./store/stats.js";
import { createMemoryStore } from "./store/users.js";

export function createApp({
  store = createMemoryStore(),
  docStore = createMemoryDocumentStore(),
  chunkStore = createMemoryChunkStore(),
  statsStore = createMemoryStatsStore(),
  chat = {},
  // Lets tests mount extra routes before the 404 fallback below.
  mount,
} = {}) {
  const app = express();
  app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
  app.use(express.json());

  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/", (req, res) => {
    res.json({ message: "AI Academy Tutor API" });
  });

  app.use("/api/auth", createAuthRouter(store));
  app.use("/api/documents", createDocumentsRouter(docStore, { chunkStore }));
  app.use(
    "/api/chat",
    createChatRouter({
      chunkStore,
      docStore,
      statsStore,
      embedQuestion: chat.embed,
      generate: chat.generate,
    }),
  );
  app.use("/api/stats", createStatsRouter({ statsStore, docStore, chunkStore }));
  app.use(uploadErrorHandler);
  if (typeof mount === "function") mount(app);

  // Unknown paths still answer JSON, so the client never gets an HTML
  // error page it can't show.
  app.use((req, res) => {
    res.status(404).json({ message: "Not found" });
  });
  app.use(errorHandler);

  return app;
}

// Anything unexpected still answers JSON, never a bare error page or a
// stack trace — the client only ever shows the message.
export function errorHandler(err, req, res, next) {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Request was not valid JSON" });
  }
  console.error(err);
  return res.status(500).json({ message: "Something went wrong — please try again" });
}
