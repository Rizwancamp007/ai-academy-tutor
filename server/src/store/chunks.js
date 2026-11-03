// Same shape as the other stores: in-memory for tests and local runs,
// Mongoose once MONGODB_URI is set.
export function createMemoryChunkStore() {
  const byDocument = new Map();
  return {
    async listForDocument(documentId) {
      return [...(byDocument.get(String(documentId)) || [])].sort((a, b) => a.index - b.index);
    },
    async replaceForDocument(documentId, records) {
      const stored = records.map((record, i) => ({
        ...record,
        documentId: String(documentId),
        index: record.index ?? i,
      }));
      byDocument.set(String(documentId), stored);
      return stored;
    },
    async removeForDocument(documentId) {
      return byDocument.delete(String(documentId));
    },
  };
}

export function createMongooseChunkStore(Chunk) {
  const toRecord = (doc) => {
    if (!doc) return null;
    const obj = doc.toObject ? doc.toObject() : doc;
    return { ...obj, id: String(obj._id), documentId: String(obj.documentId) };
  };
  return {
    async listForDocument(documentId) {
      return (await Chunk.find({ documentId }).sort({ index: 1 })).map(toRecord);
    },
    async replaceForDocument(documentId, records) {
      await Chunk.deleteMany({ documentId });
      if (records.length === 0) return [];
      const created = await Chunk.insertMany(
        records.map((record, i) => ({
          documentId,
          index: record.index ?? i,
          text: record.text,
          embedding: record.embedding,
        })),
      );
      return created.map(toRecord);
    },
    async removeForDocument(documentId) {
      const deleted = await Chunk.deleteMany({ documentId });
      return deleted.deletedCount > 0;
    },
  };
}
