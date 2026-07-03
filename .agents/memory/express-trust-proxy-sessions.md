---
name: Express trust proxy + session cookies
description: Missing trust proxy causes express-session to silently skip Set-Cookie on HTTPS-proxied deployments (Replit, Railway, Heroku, etc.)
---

## The Rule

Any Express app deployed behind an HTTPS-terminating proxy (Replit, Heroku, Railway, etc.) MUST set `app.set("trust proxy", 1)` before the session middleware.

## Why

express-session checks `isSecure(req)` before writing the `Set-Cookie` header. When `secure: true` (or `"auto"` on an HTTPS connection), it skips the cookie entirely if `req.secure === false`. Without trust proxy, Express ignores `X-Forwarded-Proto: https` from the proxy, so `req.protocol = "http"` and `req.secure = false` — even on a live HTTPS deployment.

Result: `POST /api/auth/login → 200` succeeds, session is saved to the store, but **no `Set-Cookie` header is written**. The browser never gets the cookie. Every subsequent authenticated request returns 401.

**How to apply:** Add exactly these two things:
1. `app.set("trust proxy", 1)` in `app.ts`, before `app.use(sessionMiddleware)`
2. `proxy: true` in the session options (belt-and-suspenders)
3. Use `secure: "auto"` and `sameSite: "auto"` in the cookie config — express-session then picks `Secure; SameSite=None` on HTTPS and `SameSite=Lax` on HTTP automatically, no NODE_ENV check needed.

## Observed symptom

POST auth → 200 (session stored in MemoryStore), immediate GET /api/auth/me → 401. Server-side curl round-trip works fine. Telegram WebView falsely blamed — the cookie was never sent to the browser at all.
