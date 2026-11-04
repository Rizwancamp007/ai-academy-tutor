// Turn retrieved chunks into an answer, grounded in the academy's own notes.
//
// The model is told to answer only from the supplied excerpts. When there
// are no excerpts at all, no model call is made — the honest fallback is
// returned directly, so an empty library can never produce a made-up answer.
// `generateImpl` exists so tests can run without a network call.
import { formatCitation } from "./retrieve.js";

export const NOT_IN_MATERIAL =
  "I couldn't find that in your uploaded notes — try asking about something covered in the material.";

const ANSWER_MODEL = "models/gemini-2.0-flash";
const ANSWER_URL = `https://generativelanguage.googleapis.com/v1beta/${ANSWER_MODEL}:generateContent`;

export function buildAnswerPrompt(question, sources) {
  const excerpts = sources
    .map((source, i) => `[${i + 1}] ${formatCitation(source)}\n${source.text}`)
    .join("\n\n");
  return (
    "You are a tutor for academy students. Answer the question using ONLY " +
    "the excerpts below. If the excerpts do not contain the answer, reply " +
    `with exactly: "${NOT_IN_MATERIAL}"\n\n` +
    `Excerpts:\n${excerpts}\n\nQuestion: ${question}`
  );
}

export async function generateAnswer(question, sources, { apiKey = process.env.GEMINI_API_KEY, generateImpl = fetch } = {}) {
  if (!sources || sources.length === 0) {
    return NOT_IN_MATERIAL;
  }
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  const response = await generateImpl(`${ANSWER_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildAnswerPrompt(question, sources) }] }],
    }),
  });
  if (!response.ok) {
    throw new Error(`Answer generation failed (${response.status})`);
  }
  const data = await response.json();
  const text = (data.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || "")
    .join("")
    .trim();
  return text || NOT_IN_MATERIAL;
}
