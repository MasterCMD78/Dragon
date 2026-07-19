/**
 * Object storage serving routes (public — no auth required for reads).
 *
 * GET /storage/public-objects/* — serve public bucket assets
 * GET /storage/objects/*        — serve uploaded media objects
 *
 * Upload URL generation is handled in media.ts (POST /admin/media/upload-url).
 */

import { Readable } from "stream";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  ObjectNotFoundError,
  ObjectStorageService,
} from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

// GET /storage/public-objects/* — public assets
router.get(
  "/storage/public-objects/*filePath",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join("/") : raw;
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: "File not found" });
        return;
      }
      const response = await objectStorageService.downloadObject(file);
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (err) {
      req.log.error({ err }, "Error serving public object");
      res.status(500).json({ error: "Failed to serve public object" });
    }
  },
);

// GET /storage/objects/* — uploaded media (publicly readable, no auth)
router.get(
  "/storage/objects/*path",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const raw = req.params.path;
      const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
      const objectPath = `/objects/${wildcardPath}`;
      const objectFile =
        await objectStorageService.getObjectEntityFile(objectPath);

      const response = await objectStorageService.downloadObject(objectFile);
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (err) {
      if (err instanceof ObjectNotFoundError) {
        res.status(404).json({ error: "Object not found" });
        return;
      }
      req.log.error({ err }, "Error serving object");
      res.status(500).json({ error: "Failed to serve object" });
    }
  },
);

export default router;
