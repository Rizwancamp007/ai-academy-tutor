import { useEffect, useRef, useState } from "react";
import { askQuestion } from "../api.js";
import Citation from "./Citation.jsx";

function loadHistory(userId) {
  try {
    return JSON.parse(localStorage.getItem(`tutor-chat-${userId}`) || "[]");
  } catch {
    return [];
  }
}

export default function Chat({ user }) {
  const [messages, setMessages] = useState(() => loadHistory(user.id));
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [failedQuestion, setFailedQuestion] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(`tutor-chat-${user.id}`, JSON.stringify(messages));
    } catch {
      // History is a nice-to-have; a full or blocked store shouldn't break chat.
    }
  }, [messages, user.id]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, sending]);

  async function sendQuestion(question) {
    const token = localStorage.getItem("tutor-token");
    if (!token) {
      setError("Your session expired — log in again and retry.");
      return;
    }
    setError("");
    setFailedQuestion("");
    setSending(true);
    const userMessage = { id: Date.now(), role: "user", text: question };
    setMessages((prev) => [...prev, userMessage]);
    try {
      const data = await askQuestion(token, question);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: data.answer,
          citations: data.citations || [],
        },
      ]);
    } catch (err) {
      // The question stays on screen; retry sends it again as-is.
      setError(err.message);
      setFailedQuestion(question);
    } finally {
      setSending(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    const question = input.trim();
    if (!question || sending) return;
    setInput("");
    await sendQuestion(question);
  }

  function handleRetry() {
    if (!failedQuestion || sending) return;
    sendQuestion(failedQuestion);
  }

  function handleClear() {
    setMessages([]);
    setError("");
    setFailedQuestion("");
    try {
      localStorage.removeItem(`tutor-chat-${user.id}`);
    } catch {
      // Already cleared above; nothing else to do.
    }
  }

  return (
    <section className="chat" aria-label="Chat with your notes">
      <h2>Ask your notes</h2>
      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 && !sending && (
          <p className="chat-empty">
            Ask anything covered in your uploaded notes — for example, &ldquo;Explain
            Newton&rsquo;s second law with an example&rdquo;. Answers come back with the
            notes they came from.
          </p>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`chat-message chat-message-${message.role}`}>
            <p>{message.text}</p>
            {message.role === "assistant" && message.citations?.length > 0 && (
              <div className="chat-sources">
                <p>Sources:</p>
                <ul>
                  {message.citations.map((citation) => (
                    <Citation key={`${citation.documentId}-${citation.index}`} citation={citation} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="chat-message chat-message-assistant" aria-label="Waiting for an answer">
            <p className="chat-typing" aria-hidden="true">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </p>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="error">
          {error}{" "}
          {failedQuestion && (
            <button type="button" className="link-button" onClick={handleRetry} disabled={sending}>
              Try again
            </button>
          )}
        </p>
      )}
      <form className="chat-form" onSubmit={handleSend}>
        <label className="chat-input-label">
          Your question
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your notes…"
            disabled={sending}
          />
        </label>
        <button type="submit" disabled={sending || !input.trim()}>
          {sending ? "Thinking…" : "Ask"}
        </button>
      </form>
      {messages.length > 0 && (
        <button type="button" className="chat-clear" onClick={handleClear} disabled={sending}>
          Clear chat
        </button>
      )}
    </section>
  );
}
