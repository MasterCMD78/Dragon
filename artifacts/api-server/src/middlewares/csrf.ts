import crypto from "node:crypto";
import { type Request, type Response, type NextFunction } from "express";

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
  if (!req.cookies?.[CSRF_COOKIE]) {
    const token = generateToken();
    req.cookies = { ...req.cookies, [CSRF_COOKIE]: token };
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // frontend JS must read this to mirror it into a header
      secure: "auto" as unknown as boolean,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });
  }
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
