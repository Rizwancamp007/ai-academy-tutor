import assert from "node:assert/strict";
import test from "node:test";
import { NOT_IN_MATERIAL, buildAnswerPrompt, generateAnswer } from "../src/services/answer.js";

const sources = [
  { documentTitle: "Physics Notes", index: 0, text: "Newton's second law: force equals mass times acceleration." },
];

test("no sources means the honest fallback, with no model call at all", async () => {
  const answer = await generateAnswer("What is gravity?", [], {
    generateImpl: () => {
      throw new Error("should not call the model");
    },
  });
  assert.equal(answer, NOT_IN_MATERIAL);
});

test("the prompt grounds the model in the excerpts and forbids guessing", () => {
  const prompt = buildAnswerPrompt("What is Newton's second law?", sources);
  assert.ok(prompt.includes("Newton's second law"));
  assert.ok(prompt.includes("Physics Notes (part 1)"));
  assert.ok(prompt.includes(NOT_IN_MATERIAL));
});

test("a model reply is returned as-is, with its citations intact", async () => {
  const answer = await generateAnswer("What is Newton's second law?", sources, {
    apiKey: "test-key",
    generateImpl: async () => ({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "Force equals mass times acceleration [1]." }] } }],
      }),
    }),
  });
  assert.equal(answer, "Force equals mass times acceleration [1].");
});

test("an empty model reply falls back instead of returning blank", async () => {
  const answer = await generateAnswer("What is Newton's second law?", sources, {
    apiKey: "test-key",
    generateImpl: async () => ({ ok: true, json: async () => ({ candidates: [] }) }),
  });
  assert.equal(answer, NOT_IN_MATERIAL);
});

test("a failed model request is an error, not a silent answer", async () => {
  await assert.rejects(
    () =>
      generateAnswer("What is Newton's second law?", sources, {
        apiKey: "test-key",
        generateImpl: async () => ({ ok: false, status: 500 }),
      }),
    /Answer generation failed \(500\)/,
  );
});
