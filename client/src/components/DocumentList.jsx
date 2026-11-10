export default function DocumentList({ documents, loading, error, canDelete, onDelete, deletingId }) {
  return (
    <section className="panel documents">
      <h2>Documents</h2>
      {loading && <p>Loading documents...</p>}
      {error && <p role="alert" className="error">{error}</p>}
      {!loading && documents.length === 0 && <p>No documents yet.</p>}
      <ul>
        {documents.map((doc) => (
          <li key={doc.id}>
            {doc.title} — {doc.status}
            {doc.status === "failed" && " (could not be read, try another file)"}
            {typeof doc.chunks === "number" && ` · ${doc.chunks} parts`}
            {typeof doc.questions === "number" &&
              ` · ${doc.questions} question${doc.questions === 1 ? "" : "s"}`}{" "}
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(doc.id)}
                disabled={deletingId === doc.id}
              >
                {deletingId === doc.id ? "Deleting…" : "Delete"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
