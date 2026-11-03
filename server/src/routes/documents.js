import express from "express";
import multer from "multer";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { extractText, isSupportedFile, maxUploadBytes } from "../services/extract.js";
import { publicDocument } from "../store/documents.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxUploadBytes() },
});

export function createDocumentsRouter(docStore) {
  const router = express.Router();

  // Teachers upload; students only read the library.
  router.post(
    "/",
    requireAuth,
    requireRole("teacher"),
    upload.single("file"),
    async (req, res) => {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "Choose a PDF or Word file to upload" });
      }
      if (!isSupportedFile(file)) {
        return res
          .status(400)
          .json({ message: "Only PDF and Word (.docx) files are accepted" });
      }
      let text = "";
      let status = "ready";
      try {
        text = await extractText(file.buffer, file);
        if (!text) status = "failed";
      } catch {
        status = "failed";
      }
      const doc = await docStore.create({
        title: (req.body.title || file.originalname).trim() || file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        status,
        text,
        uploadedBy: req.user.id,
      });
      return res.status(201).json({ document: publicDocument(doc) });
    },
  );

  router.get("/", requireAuth, async (req, res) => {
    const documents = await docStore.listForUser(req.user);
    return res.json({ documents: documents.map(publicDocument) });
  });

  router.get("/:id", requireAuth, async (req, res) => {
    const doc = await docStore.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }
    if (req.user.role === "teacher" && doc.uploadedBy !== req.user.id) {
      return res.status(403).json({ message: "Not allowed for this role" });
    }
    return res.json({ document: publicDocument(doc) });
  });

  router.delete("/:id", requireAuth, requireRole("teacher"), async (req, res) => {
    const doc = await docStore.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }
    if (doc.uploadedBy !== req.user.id) {
      return res.status(403).json({ message: "You can only delete your own uploads" });
    }
    await docStore.remove(req.params.id);
    return res.json({ message: "Document deleted" });
  });

  return router;
}

// Multer reports an oversized file as its own error, before our handler
// runs — turn it into a plain message instead of a server error page.
// eslint-disable-next-line no-unused-vars
export function uploadErrorHandler(err, req, res, next) {
  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "File is too large (max 10 MB)" });
  }
  if (err) {
    return res.status(400).json({ message: "Upload failed" });
  }
  return next();
}
