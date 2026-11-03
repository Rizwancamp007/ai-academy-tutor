// Same shape as the users store: an in-memory store for tests and local
// runs without a database, and a Mongoose store once MONGODB_URI is set.
export function createMemoryDocumentStore() {
  const byId = new Map();
  let nextId = 1;
  return {
    async listForUser(user) {
      const all = [...byId.values()];
      if (user.role === "teacher") {
        return all.filter((doc) => doc.uploadedBy === user.id);
      }
      return all.filter((doc) => doc.status === "ready");
    },
    async findById(id) {
      return byId.get(String(id)) || null;
    },
    async create(doc) {
      const record = {
        ...doc,
        id: String(nextId++),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      byId.set(record.id, record);
      return record;
    },
    async remove(id) {
      return byId.delete(String(id));
    },
  };
}

export function createMongooseDocumentStore(Document) {
  const toRecord = (doc) => {
    if (!doc) return null;
    const obj = doc.toObject ? doc.toObject() : doc;
    return { ...obj, id: String(obj._id) };
  };
  return {
    async listForUser(user) {
      const query =
        user.role === "teacher" ? { uploadedBy: user.id } : { status: "ready" };
      return (await Document.find(query).sort({ createdAt: -1 })).map(toRecord);
    },
    async findById(id) {
      return toRecord(await Document.findById(id));
    },
    async create(doc) {
      return toRecord(await Document.create(doc));
    },
    async remove(id) {
      const deleted = await Document.findByIdAndDelete(id);
      return Boolean(deleted);
    },
  };
}

export function publicDocument(doc) {
  if (!doc) return null;
  const { text, ...rest } = doc;
  return { ...rest, textLength: (text || "").length };
}
