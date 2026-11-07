/**
 * Fetch-based API client with automatic JWT refresh.
 *
 * Access token is stored in memory only (never localStorage).
 * The httpOnly refresh cookie is sent automatically by the browser.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

let _accessToken = null;
let _refreshPromise = null;
let _onUnauthenticated = null;

/** Called by AuthContext to register a redirect callback. */
export function setUnauthenticatedHandler(fn) {
  _onUnauthenticated = fn;
}

export function setAccessToken(token) {
  _accessToken = token;
}

export function getAccessToken() {
  return _accessToken;
}

export function clearAccessToken() {
  _accessToken = null;
}

/** Attempt to refresh the access token using the httpOnly cookie. */
async function refreshAccessToken() {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = fetch(`${BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then(async (res) => {
      if (!res.ok) throw new Error('Refresh failed');
      const data = await res.json();
      _accessToken = data.accessToken;
      return data.accessToken;
    })
    .finally(() => {
      _refreshPromise = null;
    });

  return _refreshPromise;
}

/**
 * Core request helper.
 * - Attaches Bearer token from memory.
 * - On 401: attempts one silent refresh, then retries.
 * - On second 401: calls unauthenticated handler (logout redirect).
 */
async function request(path, options = {}, isRetry = false) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (res.status === 401 && !isRetry) {
    try {
      await refreshAccessToken();
      return request(path, options, true);
    } catch {
      clearAccessToken();
      _onUnauthenticated?.();
      throw new ApiError(401, 'Session expired. Please log in again.');
    }
  }

  if (!res.ok) {
    let body;
    try {
      body = await res.json();
    } catch {
      body = {};
    }
    const message = body?.error?.message ?? res.statusText;
    const code = body?.error?.code ?? 'UNKNOWN';
    throw new ApiError(res.status, message, code, body?.error?.details);
  }

  // 204 No Content
  if (res.status === 204) return null;

  return res.json();
}

/** Structured API error. */
export class ApiError extends Error {
  constructor(status, message, code = 'UNKNOWN', details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) =>
    request(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body, options) =>
    request(path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),

  /** For multipart form data (file upload) — no Content-Type so browser sets boundary. */
  upload: (path, formData, options) =>
    request(path, {
      ...options,
      method: 'POST',
      body: formData,
      headers: { ...options?.headers },
    }),
};
