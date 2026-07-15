const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "X-CSRF-Token";
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Reads a cookie value by name from `document.cookie`. Returns null if absent. */
function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Ensures the browser holds a `csrf_token` cookie by hitting a cheap,
 * same-origin GET endpoint. The backend's `ensureCsrfToken` middleware
 * issues the cookie as a side effect of *any* response, so a lightweight
 * GET is enough to prime it. This only runs when the cookie is missing
 * (e.g. first load, or after it expires/gets cleared), so normal requests
 * never pay this extra round-trip.
 */
async function ensureCsrfCookie(): Promise<void> {
  await fetch("/api/admin/website-auth/me", { credentials: "include" }).catch(() => {});
}

/**
 * Fetch wrapper for all API calls. Always sends cookies, and for
 * state-mutating methods mirrors the current `csrf_token` cookie into the
 * `X-CSRF-Token` header, per the backend's double-submit CSRF scheme (see
 * artifacts/api-server/src/middlewares/csrf.ts). The cookie is re-read from
 * `document.cookie` on every call rather than cached, so if the token ever
 * changes (new session, cookie cleared, etc.) the next request automatically
 * picks up the fresh value.
 */
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const method = (options?.method ?? "GET").toUpperCase();
  const headers = new Headers({ "Content-Type": "application/json", ...(options?.headers ?? {}) });

  if (UNSAFE_METHODS.has(method)) {
    let token = readCookie(CSRF_COOKIE);
    if (!token) {
      await ensureCsrfCookie();
      token = readCookie(CSRF_COOKIE);
    }
    if (token) {
      headers.set(CSRF_HEADER, token);
    }
  }

  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error ?? "Request failed"), { status: res.status });
  }
  return res.json() as Promise<T>;
}
