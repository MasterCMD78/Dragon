import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// node-postgres pools emit 'error' on behalf of any *idle* client that hits a
// connection-level problem (e.g. a Neon serverless endpoint suspending due to
// inactivity and dropping the socket). This is not a per-query error — it
// cannot be caught by try/catch around a query — and per the pg docs, if the
// pool has no 'error' listener, Node treats it as an unhandled 'error' event
// and crashes the entire process. Without this listener, the server would
// start fine, pass its startup health check, then die the first time an idle
// DB connection is dropped in the background.
pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("Unexpected error on idle PostgreSQL client:", err);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
