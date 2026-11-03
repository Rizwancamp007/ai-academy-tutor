import assert from "node:assert/strict";
import test from "node:test";
import { createMemoryChunkStore } from "../src/store/chunks.js";
import { processDocument } from "../src/services/indexing.js";

const fakeEmbed = (texts) => Promise.resolve(texts.map((_, i) => [i, i + 0.5]));

test("a document becomes stored chunks with one embedding each", async () => {
  const store = createMemoryChunkStore();
  const result = await processDocument(
    { id: "doc1", text: "alpha beta gamma delta" },
    { chunkStore: store, embed: fakeEmbed },
  );
  assert.equal(result.chunks, 1);
  const chunks = await store.listForDocument("doc1");
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].index, 0);
  assert.deepEqual(chunks[0].embedding, [0, 0.5]);
});

test("reprocessing replaces old chunks instead of duplicating them", async () => {
  const store = createMemoryChunkStore();
  const doc = { id: "doc1", text: "one two three" };
  await processDocument(doc, { chunkStore: store, embed: fakeEmbed });
  await processDocument({ ...doc, text: "four five" }, { chunkStore: store, embed: fakeEmbed });
  const chunks = await store.listForDocument("doc1");
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].text, "four five");
});

test("empty text clears chunks and reports zero", async () => {
  const store = createMemoryChunkStore();
  await processDocument({ id: "doc1", text: "something" }, { chunkStore: store, embed: fakeEmbed });
  const result = await processDocument({ id: "doc1", text: "" }, { chunkStore: store, embed: fakeEmbed });
  assert.equal(result.chunks, 0);
  assert.deepEqual(await store.listForDocument("doc1"), []);
});
