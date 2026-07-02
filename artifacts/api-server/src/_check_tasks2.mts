import { db, taskCompletionsTable, transactionsTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
const statusBreakdown = await db.select({ status: taskCompletionsTable.status, approved: taskCompletionsTable.approved, cnt: sql<number>`count(*)::int` }).from(taskCompletionsTable).groupBy(taskCompletionsTable.status, taskCompletionsTable.approved);
console.log("STATUS BREAKDOWN:", JSON.stringify(statusBreakdown, null, 2));
const taskTx = await db.select().from(transactionsTable).where(eq(transactionsTable.type, "task")).limit(10);
console.log("TASK TRANSACTIONS SAMPLE:", JSON.stringify(taskTx, null, 2));
const totalCompletions = await db.select({ cnt: sql<number>`count(*)::int` }).from(taskCompletionsTable);
console.log("TOTAL COMPLETIONS:", totalCompletions[0].cnt);
process.exit(0);
