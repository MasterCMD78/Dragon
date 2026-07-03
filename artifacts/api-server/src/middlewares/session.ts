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
    // "auto" is a valid runtime value that express-session uses with proxy:true
    // to automatically set secure/sameSite based on the request protocol.
    // Required for Telegram WebApp (cross-origin WebView) in production.
    secure: "auto" as unknown as boolean,
    sameSite: "auto" as unknown as boolean,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
});

// Augment express-session types
declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}
