import { type Request, type Response, type NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "User not found" });
    return;
  }

  if (user.isBanned) {
    req.session.destroy(() => {});
    res.status(403).json({
      error: "ACCOUNT_BANNED",
      message: "Your HustleCoin account has been suspended.",
      appealAllowed: true,
    });
    return;
  }

  (req as Request & { currentUser: typeof user }).currentUser = user;
  next();
}
