// Question counts for the teacher dashboard: how many questions were
// asked, how many the notes could answer, and which documents the
// answers came from. In-memory for tests and local runs, Mongoose once
// MONGODB_URI is set — same shape as the other stores.
export function createMemoryStatsStore() {
  const events = [];
  return {
    async record(event) {
      const record = {
        question: event.question,
        answeredFromNotes: Boolean(event.answeredFromNotes),
        // One count per document per question, even if the answer cited
        // two chunks from the same document.
        documentIds: [...new Set((event.documentIds || []).map(String))],
        askedBy: event.askedBy,
        createdAt: new Date().toISOString(),
      };
      events.push(record);
      return record;
    },
    async summary() {
      const totalQuestions = events.length;
      const answeredFromNotes = events.filter((event) => event.answeredFromNotes).length;
      const questionsByDocument = {};
      for (const event of events) {
        if (!event.answeredFromNotes) continue;
        for (const id of event.documentIds) {
          questionsByDocument[id] = (questionsByDocument[id] || 0) + 1;
        }
      }
      return {
        totalQuestions,
        answeredFromNotes,
        notInMaterial: totalQuestions - answeredFromNotes,
        questionsByDocument,
      };
    },
    async recent(limit = 10) {
      return [...events].reverse().slice(0, limit);
    },
  };
}

export function createMongooseStatsStore(QuestionEvent) {
  const toRecord = (doc) => {
    if (!doc) return null;
    const obj = doc.toObject ? doc.toObject() : doc;
    return {
      ...obj,
      id: String(obj._id),
      documentIds: (obj.documentIds || []).map(String),
    };
  };
  return {
    async record(event) {
      return toRecord(
        await QuestionEvent.create({
          question: event.question,
          answeredFromNotes: Boolean(event.answeredFromNotes),
          documentIds: [...new Set((event.documentIds || []).map(String))],
          askedBy: event.askedBy,
        }),
      );
    },
    async summary() {
      const totalQuestions = await QuestionEvent.countDocuments({});
      const answeredFromNotes = await QuestionEvent.countDocuments({
        answeredFromNotes: true,
      });
      const rows = await QuestionEvent.aggregate([
        { $match: { answeredFromNotes: true } },
        { $unwind: "$documentIds" },
        { $group: { _id: "$documentIds", count: { $sum: 1 } } },
      ]);
      const questionsByDocument = {};
      for (const row of rows) questionsByDocument[String(row._id)] = row.count;
      return {
        totalQuestions,
        answeredFromNotes,
        notInMaterial: totalQuestions - answeredFromNotes,
        questionsByDocument,
      };
    },
    async recent(limit = 10) {
      return (
        await QuestionEvent.find({}).sort({ createdAt: -1 }).limit(limit)
      ).map(toRecord);
    },
  };
}
