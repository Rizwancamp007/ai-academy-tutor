import assert from "node:assert";
import test from "node:test";
import { createApp } from "../src/app.js";
import { signToken } from "../src/services/auth.js";
import { NOT_IN_MATERIAL } from "../src/services/answer.js";
import { createMemoryChunkStore } from "../src/store/chunks.js";
import { createMemoryDocumentStore } from "../src/store/documents.js";
import { createMemoryStore } from "../src/store/users.js";

process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "7d";

let base;
let server;
let docStore;
let chunkStore;
let generateCalls;

test.before(async () => {
  const store = createMemoryStore();
  docStore = createMemoryDocumentStore();
  chunkStore = createMemoryChunkStore();
  const student = await store.create({
    name: "Demo Student",
    email: "student@test.local",
    passwordHash: "hashed",
    role: "student",
  });
  const doc = await docStore.create({
    title: "Physics Notes",
    originalName: "physics.pdf",
    mimeType: "application/pdf",
    size: 100,
    status: "ready",
    text: "Newton's second law: force equals mass times acceleration.",
    uploadedBy: "teacher-1",
  });
  await chunkStore.replaceForDocument(doc.id, [
    {
      documentId: doc.id,
      index: 0,
      text: "Newton's second law: force equals mass times acceleration.",
      embedding: [1, 0],
    },
    {
      documentId: doc.id,
      index: 1,
      text: "Photosynthesis happens in the leaves of plants.",
      embedding: [0, 1],
    },
  ]);
  generateCalls = [];
  const app = createApp({
    store,
    docStore,
    chunkStore,
    chat: {
      embed: async () => [1, 0],
      generate: async (question, sources) => {
        generateCalls.push({ question, sources });
        return "Force equals mass times acceleration, from your notes.";
      },
    },
  });
  const token = signToken({ id: student.id, role: "student" }, process.env.JWT_SECRET);
  app.locals = { token };
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
  server.token = token;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

async function post(path, body, token) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

test("a student question returns a grounded answer with citations", async () => {
  const { status, body } = await post(
    "/api/chat",
    { question: "What is Newton's second law?" },
    server.token,
  );
  assert.equal(status, 200);
  assert.ok(body.answer.includes("mass times acceleration"));
  // The unrelated chunk scores 0 against the question and is not cited.
  assert.equal(body.citations.length, 1);
  assert.equal(body.citations[0].documentTitle, "Physics Notes");
  assert.equal(body.citations[0].index, 0);
  assert.ok(body.citations[0].citation.includes("Physics Notes"));
  // The closest chunk was passed to the model first.
  assert.equal(generateCalls.at(-1).sources[0].index, 0);
});

test("asking without logging in is rejected", async () => {
  const { status } = await post("/api/chat", { question: "Hello?" });
  assert.equal(status, 401);
});

test("an empty question is rejected", async () => {
  const { status } = await post("/api/chat", { question: "   " }, server.token);
  assert.equal(status, 400);
});

test("no uploaded notes means the honest fallback, not a made-up answer", async () => {
  const emptyChunks = createMemoryChunkStore();
  const emptyDocs = createMemoryDocumentStore();
  const store = createMemoryStore();
  const student = await store.create({
    name: "Other Student",
    email: "other@test.local",
    passwordHash: "hashed",
    role: "student",
  });
  const token = signToken({ id: student.id, role: "student" }, process.env.JWT_SECRET);
  const app = createApp({
    store,
    docStore: emptyDocs,
    chunkStore: emptyChunks,
    chat: {
      embed: async () => [1, 0],
      generate: async (question, sources) => {
        assert.equal(sources.length, 0);
        return NOT_IN_MATERIAL;
      },
    },
  });
  const second = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  try {
    const res = await fetch(`http://127.0.0.1:${second.address().port}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ question: "What is Newton's second law?" }),
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.answer, NOT_IN_MATERIAL);
    assert.deepEqual(body.citations, []);
  } finally {
    await new Promise((resolve) => second.close(resolve));
  }
});
