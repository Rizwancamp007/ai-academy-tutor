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
let teacherToken;
let studentToken;

test.before(async () => {
  const store = createMemoryStore();
  const docStore = createMemoryDocumentStore();
  const chunkStore = createMemoryChunkStore();
  const teacher = await store.create({
    name: "Demo Teacher",
    email: "teacher@test.local",
    passwordHash: "hashed",
    role: "teacher",
  });
  await store.create({
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
    uploadedBy: teacher.id,
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
  const app = createApp({
    store,
    docStore,
    chunkStore,
    chat: {
      embed: async () => [1, 0],
      generate: async (question) =>
        question.includes("dinosaur")
          ? NOT_IN_MATERIAL
          : "Force equals mass times acceleration, from your notes.",
    },
  });
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
  teacherToken = signToken({ id: teacher.id, role: "teacher" }, process.env.JWT_SECRET);
  const student = await store.findByEmail("student@test.local");
  studentToken = signToken({ id: student.id, role: "student" }, process.env.JWT_SECRET);
});

test.after(() => new Promise((resolve) => server.close(resolve)));

async function get(path, token) {
  const res = await fetch(`${base}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, body: await res.json() };
}

async function ask(question, token) {
  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ question }),
  });
  return { status: res.status, body: await res.json() };
}

test("stats start empty for a teacher with uploads", async () => {
  const { status, body } = await get("/api/stats", teacherToken);
  assert.equal(status, 200);
  assert.deepEqual(body.totals, {
    documents: 1,
    ready: 1,
    failed: 0,
    questions: 0,
    answeredFromNotes: 0,
    notInMaterial: 0,
  });
  assert.equal(body.documents.length, 1);
  assert.equal(body.documents[0].title, "Physics Notes");
  assert.equal(body.documents[0].chunks, 2);
  assert.equal(body.documents[0].questions, 0);
  assert.deepEqual(body.recentQuestions, []);
});

test("stats are teacher-only", async () => {
  assert.equal((await get("/api/stats")).status, 401);
  assert.equal((await get("/api/stats", studentToken)).status, 403);
});

test("asked questions show up in the totals, per document, and recent list", async () => {
  const answered = await ask("What is Newton's second law?", studentToken);
  assert.equal(answered.status, 200);
  const fallback = await ask("Did dinosaurs study physics?", studentToken);
  assert.equal(fallback.status, 200);
  assert.equal(fallback.body.answer, NOT_IN_MATERIAL);

  const { status, body } = await get("/api/stats", teacherToken);
  assert.equal(status, 200);
  assert.equal(body.totals.questions, 2);
  assert.equal(body.totals.answeredFromNotes, 1);
  assert.equal(body.totals.notInMaterial, 1);
  // Only the question the notes could answer counts for the document.
  assert.equal(body.documents[0].questions, 1);
  // Recent questions only list the ones that came from this teacher's notes.
  assert.equal(body.recentQuestions.length, 1);
  assert.equal(body.recentQuestions[0].question, "What is Newton's second law?");
  assert.equal(body.recentQuestions[0].answeredFromNotes, true);
});
