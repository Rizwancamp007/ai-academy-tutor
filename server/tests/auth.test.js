import assert from "node:assert";
import test from "node:test";
import { createApp } from "../src/app.js";
import { requireAuth, requireRole } from "../src/middleware/auth.js";
import { signToken } from "../src/services/auth.js";
import { createMemoryStore } from "../src/store/users.js";

process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "7d";

let base;
let server;
let store;

test.before(async () => {
  store = createMemoryStore();
  const app = createApp({
    store,
    mount: (a) => {
      a.get("/teacher-only", requireAuth, requireRole("teacher"), (req, res) => {
        res.json({ ok: true, role: req.user.role });
      });
    },
  });
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
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

async function get(path, token) {
  const res = await fetch(`${base}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, body: await res.json() };
}

test("register creates a teacher and returns a token, never the password hash", async () => {
  const { status, body } = await post("/api/auth/register", {
    name: "Demo Teacher",
    email: "teacher@test.local",
    password: "password123",
    role: "teacher",
  });
  assert.equal(status, 201);
  assert.equal(body.user.role, "teacher");
  assert.equal(body.user.email, "teacher@test.local");
  assert.ok(body.token);
  assert.equal(body.user.passwordHash, undefined);
  const stored = await store.findByEmail("teacher@test.local");
  assert.notEqual(stored.passwordHash, "password123");
});

test("register rejects a duplicate email, a bad role and a short password", async () => {
  const dup = await post("/api/auth/register", {
    name: "Again",
    email: "teacher@test.local",
    password: "password123",
    role: "teacher",
  });
  assert.equal(dup.status, 409);
  const badRole = await post("/api/auth/register", {
    name: "X",
    email: "x@test.local",
    password: "password123",
    role: "admin",
  });
  assert.equal(badRole.status, 400);
  const short = await post("/api/auth/register", {
    name: "X",
    email: "y@test.local",
    password: "short",
    role: "student",
  });
  assert.equal(short.status, 400);
});

test("login works, wrong password is rejected, and /me returns the user", async () => {
  const login = await post("/api/auth/login", { email: "teacher@test.local", password: "password123" });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.role, "teacher");
  const bad = await post("/api/auth/login", { email: "teacher@test.local", password: "wrongpass123" });
  assert.equal(bad.status, 401);
  const me = await get("/api/auth/me", login.body.token);
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, "teacher@test.local");
});

test("missing, invalid and expired tokens are rejected", async () => {
  assert.equal((await get("/api/auth/me")).status, 401);
  assert.equal((await get("/api/auth/me", "not-a-token")).status, 401);
  const expired = signToken({ id: "1", role: "teacher" }, "test-secret", "-1s");
  assert.equal((await get("/api/auth/me", expired)).status, 401);
});

test("teacher-only route allows teachers and blocks students", async () => {
  const teacher = await post("/api/auth/login", { email: "teacher@test.local", password: "password123" });
  assert.equal((await get("/teacher-only", teacher.body.token)).status, 200);
  await post("/api/auth/register", {
    name: "Demo Student",
    email: "student@test.local",
    password: "password123",
    role: "student",
  });
  const student = await post("/api/auth/login", { email: "student@test.local", password: "password123" });
  assert.equal((await get("/teacher-only", student.body.token)).status, 403);
  assert.equal((await get("/teacher-only")).status, 401);
});
