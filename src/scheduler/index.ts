import cron from "node-cron";
import { db } from "../db/client";
import { analysisQueue } from "../workers/queue"; // 1. Import the queue

async function processDueMonitors() {
  try {
    const result = await db.query(`
      SELECT id, url, frequency_seconds 
      FROM monitors 
      WHERE is_active = true AND next_run_at <= NOW()
    `);

    const dueMonitors = result.rows;
    if (dueMonitors.length === 0) return;

    console.log(`[Scheduler] Found ${dueMonitors.length} monitor(s) due.`);

    for (const monitor of dueMonitors) {
      // Create execution record
      const execRes = await db.query(
        `INSERT INTO executions (monitor_id, status) VALUES ($1, 'pending') RETURNING id`,
        [monitor.id]
      );
      const executionId = execRes.rows[0].id;

      // Update next_run_at
      await db.query(
        `UPDATE monitors SET next_run_at = NOW() + ($1 * INTERVAL '1 second') WHERE id = $2`,
        [monitor.frequency_seconds, monitor.id]
      );

      // 2. DISPATCH TO QUEUE (This is like SQS SendMessage)
      console.log(`[Scheduler] Pushing ${monitor.url} to the worker queue...`);
      
      analysisQueue.push({
        executionId,
        monitorId: monitor.id,
        url: monitor.url
      }).catch(err => console.error("Queue Task Error:", err));
    }
  } catch (error) {
    console.error("❌ [Scheduler Error]:", error);
  }
}

export function startScheduler() {
  const schedule = process.env.CRON_SCHEDULE || "* * * * *";
  cron.schedule(schedule, processDueMonitors);
  console.log(`Scheduler active. System is ready.`);
}