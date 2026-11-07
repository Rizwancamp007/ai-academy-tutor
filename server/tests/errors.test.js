import assert from "node:assert";
import test from "node:test";
import { createApp } from "../src/app.js";
import { signToken } from "../src/services/auth.js";
import { createMemoryChunkStore } from "../src/store/chunks.js";
import { createMemoryDocumentStore } from "../src/store/documents.js";
import { createMemoryStore } from "../src/store/users.js";

process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "7d";

let base;
let server;
let token;

test.before(async () => {
  const store = createMemoryStore();
  const student = await store.create({
    name: "Demo Student",
    email: "student@test.local",
    passwordHash: "hashed",
    role: "student",
  });
  token = signToken({ id: student.id, role: "student" }, process.env.JWT_SECRET);
  const app = createApp({
    store,
    docStore: createMemoryDocumentStore(),
    chunkStore: createMemoryChunkStore(),
  });
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("an unknown path returns a JSON 404, not an HTML error page", async () => {
  const res = await fetch(`${base}/no-such-route`);
  const body = await res.json();
  assert.equal(res.status, 404);
  assert.equal(body.message, "Not found");
});

test("a request that is not valid JSON returns a JSON 400", async () => {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not json",
  });
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.message, "Request was not valid JSON");
});

test("an unexpected failure returns a JSON 500 without a stack trace", async () => {
  const store = createMemoryStore();
  const student = await store.create({
    name: "Other Student",
    email: "other@test.local",
    passwordHash: "hashed",
    role: "student",
  });
  const failingDocs = {
    listForUser: async () => {
      throw new Error("database is down");
    },
  };
  const app = createApp({
    store,
    docStore: failingDocs,
    chunkStore: createMemoryChunkStore(),
  });
  const second = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  try {
    const failingToken = signToken(
      { id: student.id, role: "student" },
      process.env.JWT_SECRET,
    );
    const res = await fetch(`http://127.0.0.1:${second.address().port}/api/documents`, {
      headers: { Authorization: `Bearer ${failingToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 500);
    assert.equal(body.message, "Something went wrong — please try again");
    assert.equal(body.stack, undefined);
  } finally {
    await new Promise((resolve) => second.close(resolve));
  }
});
