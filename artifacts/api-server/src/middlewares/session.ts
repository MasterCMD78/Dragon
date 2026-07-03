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
    secure: "auto",
    sameSite: "auto",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
});

// Augment express-session types
declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}
