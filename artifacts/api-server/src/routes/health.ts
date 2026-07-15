import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const startedAt = Date.now();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Deeper health check for uptime monitors / admin alerts (Part 5): verifies
// the DB connection is actually usable, not just that the process is up.
router.get("/healthz/detailed", async (_req, res) => {
  const checks: Record<string, "ok" | "error"> = { server: "ok" };
  let dbLatencyMs: number | null = null;

  try {
    const start = Date.now();
    await db.execute(sql`select 1`);
    dbLatencyMs = Date.now() - start;
    checks["database"] = "ok";
  } catch {
    checks["database"] = "error";
  }

  const healthy = Object.values(checks).every((v) => v === "ok");
  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    checks,
    dbLatencyMs,
  });
});

export default router;
