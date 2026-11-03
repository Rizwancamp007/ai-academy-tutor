// Turn one ready document into searchable chunks: split the extracted
// text, embed every chunk, and store the pairs. Re-running it for the
// same document replaces the old chunks, so re-uploads never duplicate.
import { chunkText } from "./chunk.js";
import { embedTexts } from "./embed.js";

export async function processDocument(doc, { chunkStore, embed = embedTexts } = {}) {
  if (!doc || !doc.id) throw new Error("Document is required");
  if (!chunkStore) throw new Error("A chunk store is required");
  const texts = chunkText(doc.text || "");
  if (texts.length === 0) {
    await chunkStore.replaceForDocument(doc.id, []);
    return { documentId: doc.id, chunks: 0 };
  }
  const embeddings = await embed(texts);
  if (embeddings.length !== texts.length) {
    throw new Error("Embedding returned the wrong number of vectors");
  }
  const records = texts.map((text, index) => ({
    documentId: doc.id,
    index,
    text,
    embedding: embeddings[index],
  }));
  await chunkStore.replaceForDocument(doc.id, records);
  return { documentId: doc.id, chunks: records.length };
}
