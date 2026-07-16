import session from "express-session";
import createPgSessionStore from "connect-pg-simple";
import { pool } from "@workspace/db";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET env var is required");
}

// Persistent, DB-backed session store — sessions survive server restarts and
// deploys, and are shared across autoscale instances (all pointed at the
// same Postgres). The `session` table itself is created idempotently by
// checkDbAndMigrateSchema() (see lib/db-health.ts) rather than by
// connect-pg-simple's own createTableIfMissing option: that option reads a
// .sql file from disk at runtime, which does not exist once the server is
// bundled into a single dist/index.mjs by esbuild.
const PgSessionStore = createPgSessionStore(session);

const pgStore = new PgSessionStore({
  pool,
  tableName: "session",
  createTableIfMissing: false,
  // Prune expired sessions every 15 minutes instead of the 24h default —
  // keeps the table small under continuous Telegram Mini App traffic.
  pruneSessionInterval: 15 * 60,
});

pgStore.on("error", (err) => {
  // connect-pg-simple emits this on pruning/query failures; without a
  // listener, EventEmitter throws and can crash the process.
  // eslint-disable-next-line no-console
  console.error("Session store error:", err);
});

export const sessionMiddleware = session({
  store: pgStore,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    httpOnly: true,
    // secure:"auto" is a valid express-session value: it reads req.secure,
    // which respects app.set("trust proxy", 1) and Replit's HTTPS proxy.
    secure: "auto" as unknown as boolean,
    // Telegram Mini App runs in a cross-origin WebView/iframe.
    // Browsers block cookies with SameSite=Lax (the default) in cross-origin
    // contexts, so the session cookie would never be sent after login, causing
    // all user data to appear blank. SameSite=None + Secure is required.
    // "auto" is NOT a recognised express-session value for sameSite — it is
    // passed verbatim to Set-Cookie, producing an invalid attribute that
    // browsers silently ignore and treat as Lax. Use "none" explicitly.
    sameSite: "none",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
});

// Augment express-session types
declare module "express-session" {
  interface SessionData {
    userId: number;
    /**
     * CSRF token stored in the session as a cross-domain fallback.
     * When the API lives on a different origin (Railway subdomain), the
     * csrf_token cookie may be blocked by the browser's third-party cookie
     * policy, making the double-submit-cookie pattern unreliable.  Storing the
     * token in the session lets requireCsrf validate the X-CSRF-Token request
     * header against the session-resident token instead of the cookie — the
     * attacker cannot read or forge the session value.
     */
    csrfToken?: string;
  }
}
