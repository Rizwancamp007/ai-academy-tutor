import assert from "node:assert/strict";
import test from "node:test";
import { embedTexts } from "../src/services/embed.js";

const fakeFetch = (vectors) => async (url, options) => {
  assert.ok(url.startsWith("https://generativelanguage.googleapis.com/v1beta/"));
  const body = JSON.parse(options.body);
  assert.equal(body.requests.length, 2);
  assert.equal(body.requests[0].model, "models/text-embedding-004");
  return {
    ok: true,
    json: async () => ({ embeddings: vectors.map((values) => ({ values })) }),
  };
};

test("embeds a batch and returns one vector per chunk", async () => {
  const vectors = await embedTexts(["first chunk", "second chunk"], {
    apiKey: "test-key",
    fetchImpl: fakeFetch([[0.1, 0.2], [0.3, 0.4]]),
  });
  assert.deepEqual(vectors, [[0.1, 0.2], [0.3, 0.4]]);
});

test("missing key fails before any network call", async () => {
  await assert.rejects(
    () => embedTexts(["x"], { apiKey: "", fetchImpl: () => { throw new Error("should not fetch"); } }),
    /GEMINI_API_KEY is not set/,
  );
});

test("a failed embedding request is an error, not silent empty vectors", async () => {
  await assert.rejects(
    () =>
      embedTexts(["x"], {
        apiKey: "test-key",
        fetchImpl: async () => ({ ok: false, status: 400 }),
      }),
    /Embedding failed \(400\)/,
  );
});

test("a mismatched vector count is an error", async () => {
  await assert.rejects(
    () =>
      embedTexts(["a", "b"], {
        apiKey: "test-key",
        fetchImpl: fakeFetch([[0.1]]),
      }),
    /wrong number of vectors/,
  );
});
