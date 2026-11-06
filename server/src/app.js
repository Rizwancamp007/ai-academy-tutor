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

  return app;
}
