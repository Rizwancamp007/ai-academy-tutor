import cors from "cors";
import express from "express";
import { createAuthRouter } from "./routes/auth.js";
import { createDocumentsRouter, uploadErrorHandler } from "./routes/documents.js";
import { createMemoryDocumentStore } from "./store/documents.js";
import { createMemoryStore } from "./store/users.js";

export function createApp({ store = createMemoryStore(), docStore = createMemoryDocumentStore() } = {}) {
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
  app.use("/api/documents", createDocumentsRouter(docStore));
  app.use(uploadErrorHandler);

  return app;
}
