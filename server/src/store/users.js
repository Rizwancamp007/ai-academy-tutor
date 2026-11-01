export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// In-memory store, used for tests and for local runs without a database.
// Production runs use the Mongoose store below once MONGODB_URI is set.
export function createMemoryStore() {
  const byEmail = new Map();
  const byId = new Map();
  let nextId = 1;
  return {
    async findByEmail(email) {
      return byEmail.get(normalizeEmail(email)) || null;
    },
    async findById(id) {
      return byId.get(String(id)) || null;
    },
    async create(user) {
      const record = { ...user, id: String(nextId++), email: normalizeEmail(user.email) };
      byEmail.set(record.email, record);
      byId.set(record.id, record);
      return record;
    },
  };
}

export function createMongooseStore(User) {
  const toRecord = (doc) => {
    if (!doc) return null;
    const obj = doc.toObject ? doc.toObject() : doc;
    return { ...obj, id: String(obj._id) };
  };
  return {
    async findByEmail(email) {
      return toRecord(await User.findOne({ email: normalizeEmail(email) }));
    },
    async findById(id) {
      return toRecord(await User.findById(id));
    },
    async create(user) {
      return toRecord(await User.create({ ...user, email: normalizeEmail(user.email) }));
    },
  };
}
