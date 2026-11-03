import dotenv from "dotenv";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { Document } from "./models/Document.js";
import { User } from "./models/User.js";
import { createMongooseDocumentStore } from "./store/documents.js";
import { createMemoryStore, createMongooseStore } from "./store/users.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

async function main() {
  let store = createMemoryStore();
  let docStore = undefined;
  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI);
    store = createMongooseStore(User);
    docStore = createMongooseDocumentStore(Document);
    console.log("Connected to MongoDB");
  } else {
    console.log("No MONGODB_URI set, using in-memory data (resets on restart)");
  }
  const app = createApp({ store, docStore });
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
