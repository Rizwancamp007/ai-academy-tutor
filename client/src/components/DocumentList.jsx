export default function DocumentList({ documents, loading, error, canDelete, onDelete }) {
  return (
    <section>
      <h2>Documents</h2>
      {loading && <p>Loading documents...</p>}
      {error && <p role="alert">{error}</p>}
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
              <button type="button" onClick={() => onDelete(doc.id)}>
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
