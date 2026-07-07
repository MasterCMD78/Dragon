import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Recursively serialize an error including its full cause chain.
 * Pino's default error serializer only captures the top-level error;
 * it does not walk err.cause, so the underlying PostgreSQL / Neon error
 * message is silently dropped in production JSON logs.
 */
function serializeErrorChain(err: unknown): Record<string, unknown> {
  if (!err || typeof err !== "object") return { message: String(err) };
  const e = err as Record<string, unknown>;
  const out: Record<string, unknown> = {
    type: e.constructor?.name ?? "Error",
    message: e.message,
    stack: e.stack,
  };
  // Drizzle attaches the original query and params
  if (e.query) out.query = e.query;
  if (e.params) out.params = e.params;
  // PostgreSQL error fields (from the pg driver)
  if (e.code) out.pgCode = e.code;        // SQLSTATE code, e.g. "42703"
  if (e.detail) out.pgDetail = e.detail;
  if (e.hint) out.pgHint = e.hint;
  if (e.table) out.pgTable = e.table;
  if (e.column) out.pgColumn = e.column;
  // Walk the cause chain
  if (e.cause) out.cause = serializeErrorChain(e.cause);
  return out;
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  serializers: {
    // Override the default error serializer so the full cause chain
    // (including the underlying pg/Neon error message and SQLSTATE code)
    // always appears in logs — both in development and production.
    err: serializeErrorChain,
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
