import { db, tasksTable, taskCompletionsTable } from "@workspace/db";
const tasks = await db.select().from(tasksTable);
console.log("TASKS:", JSON.stringify(tasks, null, 2));
const completions = await db.select().from(taskCompletionsTable).limit(20);
console.log("COMPLETIONS SAMPLE:", JSON.stringify(completions, null, 2));
process.exit(0);
