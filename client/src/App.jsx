import { useCallback, useEffect, useState } from "react";
import {
  deleteDocument,
  fetchMe,
  listDocuments,
  login,
  register,
  uploadDocument,
} from "./api.js";
import Chat from "./components/Chat.jsx";
import Dashboard from "./components/Dashboard.jsx";
import DocumentList from "./components/DocumentList.jsx";

export default function App() {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("tutor-user") || "null");
    } catch {
      return null;
    }
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState("");
  const [uploading, setUploading] = useState(false);

  const loadDocuments = useCallback(async () => {
    const token = localStorage.getItem("tutor-token");
    if (!token) return;
    setDocsLoading(true);
    setDocsError("");
    try {
      setDocuments(await listDocuments(token));
    } catch (err) {
      setDocsError(err.message);
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadDocuments();
  }, [user, loadDocuments]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data =
        mode === "login"
          ? await login(email, password)
          : await register(name, email, password, role);
      localStorage.setItem("tutor-token", data.token);
      localStorage.setItem("tutor-user", JSON.stringify(data.user));
      setUser(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("tutor-token");
    localStorage.removeItem("tutor-user");
    setUser(null);
    setDocuments([]);
    setEmail("");
    setPassword("");
  }

  async function handleRefresh() {
    const token = localStorage.getItem("tutor-token");
    if (!token) return;
    try {
      const me = await fetchMe(token);
      setUser(me);
      localStorage.setItem("tutor-user", JSON.stringify(me));
    } catch {
      handleLogout();
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    const file = e.target.elements.file.files[0];
    if (!file) return;
    const token = localStorage.getItem("tutor-token");
    setUploading(true);
    setDocsError("");
    try {
      await uploadDocument(token, file);
      e.target.reset();
      await loadDocuments();
    } catch (err) {
      setDocsError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    const token = localStorage.getItem("tutor-token");
    try {
      await deleteDocument(token, id);
      await loadDocuments();
    } catch (err) {
      setDocsError(err.message);
    }
  }

  if (user) {
    return (
      <main>
        <h1>AI Academy Tutor</h1>
        <p>
          Signed in as {user.name} ({user.role}).
        </p>
        <button type="button" onClick={handleRefresh}>Refresh session</button>{" "}
        <button type="button" onClick={handleLogout}>Log out</button>
        <p>Ask questions about your academy&apos;s notes, and get answers with citations.</p>

        <Chat user={user} />

        {user.role === "teacher" ? (
          <Dashboard
            documents={documents}
            docsLoading={docsLoading}
            docsError={docsError}
            uploading={uploading}
            onUpload={handleUpload}
            onDelete={handleDelete}
          />
        ) : (
          <DocumentList
            documents={documents}
            loading={docsLoading}
            error={docsError}
            canDelete={false}
          />
        )}
      </main>
    );
  }

  return (
    <main>
      <h1>AI Academy Tutor</h1>
      <p>Ask questions about your academy&apos;s notes, and get answers with citations.</p>
      <div>
        <button type="button" onClick={() => setMode("login")}>Log in</button>{" "}
        <button type="button" onClick={() => setMode("register")}>Register</button>
      </div>
      <form onSubmit={handleSubmit}>
        {mode === "register" && (
          <div>
            <label>
              Name{" "}
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
          </div>
        )}
        <div>
          <label>
            Email{" "}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
        </div>
        <div>
          <label>
            Password{" "}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
        </div>
        {mode === "register" && (
          <div>
            <label>
              Role{" "}
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </label>
          </div>
        )}
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Log in" : "Register"}
        </button>
      </form>
    </main>
  );
}
