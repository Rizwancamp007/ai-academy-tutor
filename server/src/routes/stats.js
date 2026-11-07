import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

// Teacher dashboard numbers. Totals are academy-wide (one academy shares
// one tutor); the per-document rows and recent questions are scoped to the
// teacher's own uploads, so a teacher only sees questions about their notes.
export function createStatsRouter({ statsStore, docStore, chunkStore } = {}) {
  if (!statsStore) throw new Error("A stats store is required");
  if (!docStore) throw new Error("A document store is required");
  const router = express.Router();

  router.get("/", requireAuth, requireRole("teacher"), asyncHandler(async (req, res) => {
    const summary = await statsStore.summary();
    const recent = await statsStore.recent(10);
    const documents = await docStore.listForUser(req.user);
    const ownIds = new Set(documents.map((doc) => String(doc.id)));

    const perDocument = [];
    for (const doc of documents) {
      const chunks = chunkStore
        ? await chunkStore.listForDocument(doc.id)
        : [];
      perDocument.push({
        id: doc.id,
        title: doc.title,
        status: doc.status,
        chunks: chunks.length,
        questions: summary.questionsByDocument[String(doc.id)] || 0,
      });
    }

    return res.json({
      totals: {
        documents: documents.length,
        ready: documents.filter((doc) => doc.status === "ready").length,
        failed: documents.filter((doc) => doc.status === "failed").length,
        questions: summary.totalQuestions,
        answeredFromNotes: summary.answeredFromNotes,
        notInMaterial: summary.notInMaterial,
      },
      documents: perDocument,
      recentQuestions: recent
        .filter((event) => event.documentIds.some((id) => ownIds.has(String(id))))
        .map((event) => ({
          question: event.question,
          answeredFromNotes: event.answeredFromNotes,
          createdAt: event.createdAt,
        })),
    });
  }));

  return router;
}
