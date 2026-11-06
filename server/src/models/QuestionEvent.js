import mongoose from "mongoose";

// One row per question asked in chat, so the teacher dashboard can show
// how much students are asking and which documents the answers came from.
// The question text is kept (teachers can see what students are stuck on);
// no answer text is stored.
const questionEventSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answeredFromNotes: { type: Boolean, required: true },
    documentIds: { type: [String], default: [] },
    askedBy: { type: String, required: true },
  },
  { timestamps: true },
);

questionEventSchema.index({ documentIds: 1 });

export const QuestionEvent =
  mongoose.models.QuestionEvent ||
  mongoose.model("QuestionEvent", questionEventSchema);
