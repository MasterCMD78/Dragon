import express, { type Express } from "express";
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

export default app;
