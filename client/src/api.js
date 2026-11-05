const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(path, body, token) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

export function login(email, password) {
  return request("/api/auth/login", { email, password });
}

export function register(name, email, password, role) {
  return request("/api/auth/register", { name, email, password, role });
}

export async function fetchMe(token) {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data.user;
}

export async function listDocuments(token) {
  const res = await fetch(`${API_URL}/api/documents`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data.documents;
}

export async function uploadDocument(token, file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/api/documents`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data.document;
}

export async function deleteDocument(token, id) {
  const res = await fetch(`${API_URL}/api/documents/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

export function askQuestion(token, question) {
  return request("/api/chat", { question }, token);
}
