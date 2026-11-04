import assert from "node:assert/strict";
import test from "node:test";
import { TOP_CHUNKS, cosineSimilarity, formatCitation, rankChunks } from "../src/services/retrieve.js";

test("identical vectors score 1, opposite vectors score -1", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [-1, 0]), -1);
});

test("zero vectors and missing embeddings score 0, never NaN", () => {
  assert.equal(cosineSimilarity([0, 0], [1, 2]), 0);
  assert.equal(cosineSimilarity(null, [1, 2]), 0);
});

test("ranking returns the closest chunks first, capped at five", () => {
  const chunks = [
    { documentId: "d1", index: 0, text: "unrelated", embedding: [0, 1] },
    { documentId: "d1", index: 1, text: "closest", embedding: [1, 0] },
    { documentId: "d1", index: 2, text: "halfway", embedding: [1, 1] },
    { documentId: "d1", index: 3, text: "no vector", embedding: [] },
    { documentId: "d1", index: 4, text: "zero vector", embedding: [0, 0] },
  ];
  const ranked = rankChunks(chunks, [1, 0]);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].text, "closest");
  assert.equal(ranked[1].text, "halfway");
  assert.ok(ranked[0].score > ranked[1].score);
  const many = Array.from({ length: 8 }, (_, i) => ({
    documentId: "d1",
    index: i,
    text: `chunk ${i}`,
    embedding: [1, 0.1 * i],
  }));
  assert.equal(rankChunks(many, [1, 0]).length, TOP_CHUNKS);
});

test("citations name the document and the part", () => {
  assert.equal(formatCitation({ documentTitle: "Physics Notes", index: 2 }), "Physics Notes (part 3)");
  assert.equal(formatCitation({ documentId: "abc", index: 0 }), "abc (part 1)");
});
