const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// A dropped connection or a server that isn't running shows up as a bare
// fetch failure — turn it into something a student can act on.
function friendlyError(err) {
  if (err instanceof TypeError) {
    return new Error("Could not reach the server — check your connection and try again");
  }
  return err;
}

async function request(path, body, token) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw friendlyError(err);
  }
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
  let res;
  try {
    res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    throw friendlyError(err);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data.user;
}

export async function listDocuments(token) {
  let res;
  try {
    res = await fetch(`${API_URL}/api/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    throw friendlyError(err);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data.documents;
}

export async function uploadDocument(token, file) {
  const form = new FormData();
  form.append("file", file);
  let res;
  try {
    res = await fetch(`${API_URL}/api/documents`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch (err) {
    throw friendlyError(err);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data.document;
}

export async function deleteDocument(token, id) {
  let res;
  try {
    res = await fetch(`${API_URL}/api/documents/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    throw friendlyError(err);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

export function askQuestion(token, question) {
  return request("/api/chat", { question }, token);
}

export async function fetchStats(token) {
  let res;
  try {
    res = await fetch(`${API_URL}/api/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    throw friendlyError(err);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}
