// frontend/src/utils/api.js
// When running in Docker, VITE_API_URL is an internal hostname (e.g. http://backend:5000)
// that the browser cannot resolve. We use relative URLs instead so Vite's proxy handles
// the routing. Falls back to the env value for non-Docker local dev without proxy.
const rawApiUrl = import.meta.env.VITE_API_URL || "";
export const API_BASE = rawApiUrl.startsWith("http://backend") ? "" : rawApiUrl;


export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
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
