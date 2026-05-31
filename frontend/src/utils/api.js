// frontend/src/utils/api.js
//
// All requests use RELATIVE paths (e.g. "/api/users/login").
// Vite's dev-server proxy (vite.config.js) routes each /api/* prefix
// to the correct microservice port.  In production, an Nginx reverse-proxy
// or API Gateway does the same job.

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(path, {        // ← always relative, no base URL needed
    ...options,
    headers,
  });

  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message = data?.message || data || res.statusText;
    const error = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

// Kept for any component that still destructures API_BASE (e.g. raw fetch calls).
// Empty string = relative URL, proxy takes over.
export const API_BASE = "";
