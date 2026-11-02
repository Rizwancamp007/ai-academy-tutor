import mammoth from "mammoth";
import pdfParse from "pdf-parse";

// Only the formats teachers actually hand out. Anything else is rejected
// before parsing, so a random file can never reach the text pipeline.
export const SUPPORTED_TYPES = [
  { mime: "application/pdf", ext: ".pdf" },
  {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ext: ".docx",
  },
];

export function maxUploadBytes() {
  const mb = Number(process.env.MAX_UPLOAD_MB || 10);
  return (Number.isFinite(mb) && mb > 0 ? mb : 10) * 1024 * 1024;
}

export function isSupportedFile(file) {
  if (!file) return false;
  const name = (file.originalname || "").toLowerCase();
  return SUPPORTED_TYPES.some(
    (type) => file.mimetype === type.mime || name.endsWith(type.ext),
  );
}

export async function extractText(buffer, file) {
  const name = (file.originalname || "").toLowerCase();
  if (file.mimetype === "application/pdf" || name.endsWith(".pdf")) {
    const data = await pdfParse(buffer);
    return (data.text || "").trim();
  }
  if (
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || "").trim();
  }
  throw new Error("Unsupported file type");
}
