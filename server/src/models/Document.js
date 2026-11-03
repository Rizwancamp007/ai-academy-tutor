import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    // ready = text extracted and usable for questions; failed = the file
    // could not be read (corrupt file, empty text). Chunking runs later.
    status: { type: String, enum: ["ready", "failed"], default: "ready" },
    text: { type: String, default: "" },
    uploadedBy: { type: String, required: true },
  },
  { timestamps: true },
);

documentSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

export const Document =
  mongoose.models.Document || mongoose.model("Document", documentSchema);
