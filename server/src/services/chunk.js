// Split extracted text into overlapping chunks for embeddings.
//
// Rough sizing: ~400 words is close to 500 tokens for plain notes, and a
// 50-word overlap keeps a sentence that straddles a boundary searchable
// from either side. Chunks are word windows, so nothing is lost to a
// paragraph split and no chunk ever comes back empty.
export const CHUNK_WORDS = 400;
export const CHUNK_OVERLAP_WORDS = 50;

export function chunkText(text, { chunkWords = CHUNK_WORDS, overlapWords = CHUNK_OVERLAP_WORDS } = {}) {
  const words = (text || "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  if (words.length <= chunkWords) return [words.join(" ")];
  const step = Math.max(1, chunkWords - overlapWords);
  const chunks = [];
  for (let start = 0; start < words.length; start += step) {
    chunks.push(words.slice(start, start + chunkWords).join(" "));
    if (start + chunkWords >= words.length) break;
  }
  return chunks;
}
