import { useEffect, useState } from "react";
import { fetchStats } from "../api.js";
import DocumentList from "./DocumentList.jsx";

export default function Dashboard({
  documents,
  docsLoading,
  docsError,
  uploading,
  onUpload,
  onDelete,
}) {
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("tutor-token");
    if (!token) {
      setStatsLoading(false);
      return;
    }
    fetchStats(token)
      .then(setStats)
      .catch((err) => setStatsError(err.message))
      .finally(() => setStatsLoading(false));
  }, []);

  const statsById = new Map((stats?.documents || []).map((doc) => [doc.id, doc]));
  const docsWithStats = documents.map((doc) => {
    const row = statsById.get(doc.id);
    return row ? { ...doc, chunks: row.chunks, questions: row.questions } : doc;
  });

  return (
    <section aria-label="Teacher dashboard">
      <h2>Teacher dashboard</h2>
      {statsLoading && <p>Loading stats...</p>}
      {statsError && <p role="alert">{statsError}</p>}
      {stats && (
        <div className="stats">
          <div className="stat">
            <strong>{stats.totals.documents}</strong>
            <span>Documents</span>
          </div>
          <div className="stat">
            <strong>{stats.totals.questions}</strong>
            <span>Questions asked</span>
          </div>
          <div className="stat">
            <strong>{stats.totals.answeredFromNotes}</strong>
            <span>Answered from notes</span>
          </div>
          <div className="stat">
            <strong>{stats.totals.notInMaterial}</strong>
            <span>Not in the notes</span>
          </div>
        </div>
      )}
      {stats && stats.recentQuestions.length > 0 && (
        <div>
          <h3>Recent questions</h3>
          <ul>
            {stats.recentQuestions.map((item, i) => (
              <li key={`${item.createdAt}-${i}`}>
                {item.question} —{" "}
                {item.answeredFromNotes ? "answered from notes" : "not in the notes"}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3>Upload notes</h3>
      <form onSubmit={onUpload}>
        <label>
          PDF or Word file{" "}
          <input name="file" type="file" accept=".pdf,.docx" required />
        </label>{" "}
        <button type="submit" disabled={uploading}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>

      <DocumentList
        documents={docsWithStats}
        loading={docsLoading}
        error={docsError}
        canDelete
        onDelete={onDelete}
      />
    </section>
  );
}
