import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { sessionMiddleware } from "./middlewares/session";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const IS_DEV = process.env.NODE_ENV !== "production";
const allowedOrigins = process.env.REPLIT_DOMAINS
  ? process.env.REPLIT_DOMAINS.split(",").map((d) => `https://${d.trim()}`)
  : [];

// In production, fail-closed: reject credentialed requests if REPLIT_DOMAINS is missing.
// In development, allow all origins for local testing.
app.use(
  cors({
    origin: IS_DEV || allowedOrigins.length > 0 ? (allowedOrigins.length > 0 ? allowedOrigins : true) : false,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);

app.use("/api", router);

/**
 * Global error handler — must be registered after all routes.
 * Express 5 automatically catches async route errors and passes them here.
 * Without this, unhandled route errors produce a generic 500 with no JSON body
 * and pino-http logs a synthetic "failed with status code 500" error that hides
 * the real cause. This handler passes the original error object to req.log so
 * the shared pino serializer (serializeErrorChain in logger.ts) emits the full
 * cause chain — including PostgreSQL SQLSTATE code and pg error message.
 */
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  // Pass the raw error — the shared pino serializer walks the cause chain,
  // captures pgCode/pgDetail/pgHint/stack at every level.
  req.log.error({ err }, "Unhandled route error");

  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default app;
