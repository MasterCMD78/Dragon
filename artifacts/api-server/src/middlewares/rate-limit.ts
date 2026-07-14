import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";

/**
 * Rate limiters. All use the default in-memory store, which is per-process —
 * correct for a single autoscale instance, and acceptable here because the
 * limits below are generous safety nets against abuse/brute-force rather
 * than precise global quotas. If the API server ever runs with multiple
 * concurrent instances behind the load balancer, move to a shared store
 * (e.g. rate-limit-postgresql) to make limits instance-independent.
 */

// Login endpoints (Telegram auth + website admin password login) are the
// highest-value brute-force target — keep this tight.
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

// Admin panel — generous enough for real admin usage, still bounds abuse if
// an admin session/credential were ever compromised.
export const adminLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many admin requests. Please slow down." },
});

// Baseline for every other /api route (mining, wallet, referrals, quests,
// public endpoints, etc.) — protects against scripted abuse without
// affecting normal Mini App usage.
export const generalApiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});
