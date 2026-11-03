// Gemini embeddings, one call per batch of chunks.
//
// The key is read from the environment at call time, never stored, and a
// missing key fails loudly instead of silently producing unsearchable
// chunks. `fetchImpl` exists so tests can run without a network call.
const EMBED_MODEL = "models/text-embedding-004";
const EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/${EMBED_MODEL}:batchEmbedContents`;

export async function embedTexts(texts, { apiKey = process.env.GEMINI_API_KEY, fetchImpl = fetch } = {}) {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  const list = (texts || []).filter((text) => typeof text === "string" && text.length > 0);
  if (list.length === 0) return [];
  const response = await fetchImpl(`${EMBED_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: list.map((text) => ({
        model: EMBED_MODEL,
        content: { parts: [{ text }] },
      })),
    }),
  });
  if (!response.ok) {
    throw new Error(`Embedding failed (${response.status})`);
  }
  const data = await response.json();
  const embeddings = (data.embeddings || []).map((entry) => entry.values || []);
  if (embeddings.length !== list.length) {
    throw new Error("Embedding returned the wrong number of vectors");
  }
  return embeddings;
}

export async function embedText(text, options) {
  const [embedding] = await embedTexts([text], options);
  return embedding;
}
