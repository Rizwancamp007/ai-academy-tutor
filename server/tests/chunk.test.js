import assert from "node:assert/strict";
import test from "node:test";
import { chunkText } from "../src/services/chunk.js";

const words = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");

test("short text stays in one chunk", () => {
  assert.deepEqual(chunkText("hello world"), ["hello world"]);
});

test("empty text produces no chunks", () => {
  assert.deepEqual(chunkText(""), []);
  assert.deepEqual(chunkText("   "), []);
});

test("long text chunks overlap so boundary words appear in both neighbours", () => {
  const chunks = chunkText(words(1000));
  assert.ok(chunks.length > 1);
  for (const chunk of chunks) {
    assert.ok(chunk.split(" ").length <= 400, "chunk exceeds the word limit");
  }
  const first = chunks[0].split(" ");
  const second = chunks[1].split(" ");
  // Overlap: the tail of chunk 1 is the head of chunk 2.
  assert.deepEqual(second.slice(0, 50), first.slice(-50));
  // Nothing lost: the last chunk ends on the final word.
  assert.equal(chunks.at(-1).split(" ").at(-1), "w999");
});

test("exact boundary text does not add an empty trailing chunk", () => {
  assert.equal(chunkText(words(400)).length, 1);
});
