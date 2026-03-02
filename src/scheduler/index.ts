import cron from "node-cron";
import { db } from "../db/client";

async function processDueMonitors() {
  try {
    const result = await db.query(`
      SELECT id, url, frequency_seconds 
      FROM monitors 
      WHERE is_active = true AND next_run_at <= NOW()
    `);

    const dueMonitors = result.rows;

    if (dueMonitors.length === 0) {
      return; 
    }

    console.log(`Found ${dueMonitors.length} monitor(s) ready to run.`);

    for (const monitor of dueMonitors) {
      const execResult = await db.query(`
        INSERT INTO executions (monitor_id, status)
        VALUES ($1, 'pending')
        RETURNING id
      `, [monitor.id]);

      const executionId = execResult.rows[0].id;

      await db.query(`
        UPDATE monitors 
        SET next_run_at = NOW() + ($1 * INTERVAL '1 second')
        WHERE id = $2
      `, [monitor.frequency_seconds, monitor.id]);

      console.log(`Dispatched job for ${monitor.url} (Execution ID: ${executionId})`);
    }

  } catch (error) {
    console.error("❌ Error in scheduler:", error);
  }
}

export function startScheduler() {
  cron.schedule("* * * * *", processDueMonitors);
  console.log("Scheduler started. Polling every minute.");
}