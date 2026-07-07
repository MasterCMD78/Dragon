import session from "express-session";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET env var is required");
}

export const sessionMiddleware = session({
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
  }
}
