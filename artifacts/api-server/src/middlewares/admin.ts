import { type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "./auth";
import { type usersTable } from "@workspace/db";

export type AdminRequest = Request & {
  currentUser: typeof usersTable.$inferSelect;
};

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await new Promise<void>((resolve) => {
    requireAuth(req, res, () => resolve());
  });

  if (res.headersSent) return;

  const user = (req as AdminRequest).currentUser;
  if (!user?.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
}
