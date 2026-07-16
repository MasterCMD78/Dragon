import crypto from "node:crypto";
import { type Request, type Response, type NextFunction } from "express";

// Origins that the CORS middleware already trusts.  Requests arriving with
// one of these Origin values have already been verified by the CORS allowlist
// — an attacker from a different origin cannot forge an Origin header that
// passes the CORS check and reaches this middleware.  For these requests CORS
// provides equivalent CSRF protection to the cookie-mirror pattern, so we
// skip the double-submit check.  Requests with no Origin header are
// same-origin and are inherently safe from CSRF.
//
// REPLIT_DOMAINS  — bare hostnames injected by Replit automatically.
// ALLOWED_ORIGINS — full https:// URLs set for non-Replit deployments (e.g. Railway).
const CORS_TRUSTED_ORIGINS = new Set<string>([
  ...(process.env.REPLIT_DOMAINS
    ? process.env.REPLIT_DOMAINS.split(",").map((d) => `https://${d.trim()}`)
    : []),
  ...(process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
    : []),
]);

/**
 * Double-submit-cookie CSRF protection.
 *
 * Why this shape: the session cookie must be `SameSite=None` (Telegram Mini
 * App runs the frontend in a cross-origin WebView), which means an
 * attacker's page can trigger authenticated cross-site requests using the
 * browser's ambient session cookie. Double-submit defeats this because the
 * attacker's page cannot read the `csrf_token` cookie (different origin) and
 * therefore cannot reproduce it in the `X-CSRF-Token` header, even though
 * the browser will still attach the cookie automatically.
 *
 * `ensureCsrfToken` issues a random token cookie (readable by JS — it must
 * be, so the frontend can mirror it into a header) on every response that
 * doesn't already have one. `requireCsrf` then rejects any unsafe request
 * whose header doesn't match the cookie.
 */

const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Endpoints that legitimately mutate state without an existing session to
// anchor a CSRF token to — a forged cross-site call here has no more power
// than a normal call (login just logs the *attacker* in; the public
// endpoints are intentionally unauthenticated). Keeping this list short and
// explicit is safer than trying to infer "is this authenticated" generically.
const CSRF_EXEMPT_PATHS = new Set<string>([
  "/api/auth/telegram",
  "/api/admin/website-auth/login",
  "/api/public/contact",
  "/api/public/analytics/track",
]);

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function ensureCsrfToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  let token: string;
  if (!req.cookies?.[CSRF_COOKIE]) {
    token = generateToken();
    req.cookies = { ...req.cookies, [CSRF_COOKIE]: token };
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // frontend JS must read this to mirror it into a header
      secure: "auto" as unknown as boolean,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });
  } else {
    token = req.cookies[CSRF_COOKIE] as string;
  }

  // Expose the CSRF token in a response header so cross-origin frontends
  // (e.g. the Mini App on a different Railway subdomain) can capture it.
  // document.cookie is domain-restricted, so the frontend JS cannot read the
  // csrf_token cookie when the API lives on a different origin.  Echoing it
  // here lets customFetch cache the value and mirror it back on unsafe
  // requests — equivalent to the double-submit-cookie check but without
  // requiring same-origin cookie access.
  res.setHeader("X-CSRF-Token", token);

  next();
}

export function requireCsrf(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  if (CSRF_EXEMPT_PATHS.has(req.path)) {
    next();
    return;
  }

  // Cross-origin requests from CORS-trusted origins (and same-origin requests
  // that carry no Origin header) don't need the cookie-mirror check — the
  // CORS allowlist already ensures only our own frontend can reach this point
  // with a credentialed cross-origin request.
  const requestOrigin = req.headers.origin as string | undefined;
  if (!requestOrigin || CORS_TRUSTED_ORIGINS.has(requestOrigin)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER];

  const isValid =
    typeof cookieToken === "string" &&
    typeof headerToken === "string" &&
    cookieToken.length > 0 &&
    cookieToken.length === headerToken.length &&
    crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));

  if (!isValid) {
    res.status(403).json({ error: "CSRF token missing or invalid" });
    return;
  }

  next();
}
