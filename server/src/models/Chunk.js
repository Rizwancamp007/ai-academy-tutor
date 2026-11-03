import mongoose from "mongoose";

const chunkSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true },
    index: { type: Number, required: true },
    text: { type: String, required: true },
    // Plain number array, not a vector type: academy-scale retrieval
    // (hundreds/thousands of chunks) runs fine with cosine search in code.
    embedding: { type: [Number], required: true },
  },
  { timestamps: true },
);

chunkSchema.index({ documentId: 1, index: 1 });

export const Chunk = mongoose.models.Chunk || mongoose.model("Chunk", chunkSchema);
