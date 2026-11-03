import assert from "node:assert";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createMemoryDocumentStore } from "../src/store/documents.js";
import { createMemoryStore } from "../src/store/users.js";

process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "7d";

let base;
let server;

// Build a minimal .docx (a zip with stored, uncompressed entries) without
// any extra dependency, so the upload test exercises real mammoth parsing.
const CRC_TABLE = (() => {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makeDocx(text) {
  const files = [
    [
      "[Content_Types].xml",
      `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    ],
    [
      "_rels/.rels",
      `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    ],
    [
      "word/document.xml",
      `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`,
    ],
  ];
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const [name, content] of files) {
    const nameBuf = Buffer.from(name);
    const dataBuf = Buffer.from(content);
    const crc = crc32(dataBuf);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(dataBuf.length, 18);
    local.writeUInt32LE(dataBuf.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, dataBuf);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0, 8);
    entry.writeUInt16LE(0, 10);
    entry.writeUInt16LE(0, 12);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(dataBuf.length, 20);
    entry.writeUInt32LE(dataBuf.length, 24);
    entry.writeUInt16LE(nameBuf.length, 28);
    entry.writeUInt16LE(0, 30);
    entry.writeUInt16LE(0, 32);
    entry.writeUInt16LE(0, 34);
    entry.writeUInt16LE(0, 36);
    entry.writeUInt32LE(0, 38);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBuf);
    offset += local.length + nameBuf.length + dataBuf.length;
  }
  const centralSize = central.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...chunks, ...central, end]);
}

let teacherToken;
let studentToken;
let otherTeacherToken;

test.before(async () => {
  const store = createMemoryStore();
  const app = createApp({ store, docStore: createMemoryDocumentStore() });
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
  async function register(name, email, role) {
    const res = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password: "password123", role }),
    });
    const body = await res.json();
    assert.equal(res.status, 201);
    return body.token;
  }
  teacherToken = await register("Teacher One", "t1@test.local", "teacher");
  studentToken = await register("Student One", "s1@test.local", "student");
  otherTeacherToken = await register("Teacher Two", "t2@test.local", "teacher");
});

test.after(() => new Promise((resolve) => server.close(resolve)));

async function upload(token, buffer, filename, mime) {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mime }), filename);
  const res = await fetch(`${base}/api/documents`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  return { status: res.status, body: await res.json() };
}

async function get(path, token) {
  const res = await fetch(`${base}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, body: await res.json() };
}

test("teacher upload of a Word file extracts its text", async () => {
  const { status, body } = await upload(
    teacherToken,
    makeDocx("Photosynthesis basics for class 9"),
    "notes.docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  assert.equal(status, 201);
  assert.equal(body.document.status, "ready");
  assert.equal(body.document.title, "notes.docx");
  assert.ok(body.document.textLength > 0);
  assert.equal(body.document.text, undefined);
});

test("a corrupt PDF is kept as failed, not a crash", async () => {
  const { status, body } = await upload(
    teacherToken,
    Buffer.from("this is not a pdf at all"),
    "broken.pdf",
    "application/pdf",
  );
  assert.equal(status, 201);
  assert.equal(body.document.status, "failed");
});

test("upload validation: students blocked, no token blocked, bad type rejected", async () => {
  const asStudent = await upload(
    studentToken,
    makeDocx("hello"),
    "notes.docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  assert.equal(asStudent.status, 403);
  const noToken = await upload(
    null,
    makeDocx("hello"),
    "notes.docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  assert.equal(noToken.status, 401);
  const badType = await upload(teacherToken, Buffer.from("hello"), "notes.txt", "text/plain");
  assert.equal(badType.status, 400);
});

test("library: students only see ready documents, teachers only their own", async () => {
  const studentList = await get("/api/documents", studentToken);
  assert.equal(studentList.status, 200);
  assert.ok(studentList.body.documents.every((d) => d.status === "ready"));
  assert.ok(studentList.body.documents.some((d) => d.title === "notes.docx"));
  const teacherList = await get("/api/documents", teacherToken);
  assert.ok(teacherList.body.documents.some((d) => d.title === "notes.docx"));
  const otherList = await get("/api/documents", otherTeacherToken);
  assert.ok(!otherList.body.documents.some((d) => d.title === "notes.docx"));
});

test("delete: only the teacher who uploaded it, then it is gone", async () => {
  const { body } = await upload(
    teacherToken,
    makeDocx("to be deleted"),
    "delete-me.docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  const id = body.document.id;
  const byOther = await fetch(`${base}/api/documents/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${otherTeacherToken}` },
  });
  assert.equal(byOther.status, 403);
  const byOwner = await fetch(`${base}/api/documents/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  assert.equal(byOwner.status, 200);
  assert.equal((await get(`/api/documents/${id}`, teacherToken)).status, 404);
});
