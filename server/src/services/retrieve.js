// Rank stored chunks against an embedded question with cosine similarity.
//
// Academy-scale retrieval (hundreds/thousands of chunks) runs fine in code,
// so there is no vector database to deploy. Chunks without an embedding, or
// with a zero-length vector, are skipped rather than ranked.
export const TOP_CHUNKS = 5;

export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) {
    return 0;
  }
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function rankChunks(chunks, queryEmbedding, { topN = TOP_CHUNKS } = {}) {
  const ranked = (chunks || [])
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(chunk.embedding, queryEmbedding),
    }))
    .filter((entry) => entry.chunk.embedding && entry.chunk.embedding.length > 0 && entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
  return ranked.map(({ chunk, score }) => ({ ...chunk, score }));
}

// Citations stay plain and checkable: the document name plus which part
// of it the answer came from, so a student can open the notes and verify.
export function formatCitation(source) {
  const title = source.documentTitle || source.documentId || "Uploaded notes";
  const part = typeof source.index === "number" ? source.index + 1 : "?";
  return `${title} (part ${part})`;
}
