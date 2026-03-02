import cron from "node-cron";
import { db } from "../db/client";
import { analyzeWebsite } from "../workers/analyzer"; // 1. Import the worker

async function processDueMonitors() {
  try {
    // 2. Fetch monitors that are due
    const result = await db.query(`
      SELECT id, url, frequency_seconds 
      FROM monitors 
      WHERE is_active = true AND next_run_at <= NOW()
    `);

    const dueMonitors = result.rows;

    if (dueMonitors.length === 0) return;

    console.log(`⏰ [Scheduler] Found ${dueMonitors.length} monitor(s) due for check.`);

    for (const monitor of dueMonitors) {
      // 3. Create the execution record (Observability)
      const execResult = await db.query(`
        INSERT INTO executions (monitor_id, status)
        VALUES ($1, 'pending')
        RETURNING id
      `, [monitor.id]);

      const executionId = execResult.rows[0].id;

      // 4. Update next_run_at IMMEDIATELY
      // This prevents the next cron cycle from picking up the same job 
      // if the current analysis takes longer than 1 minute.
      await db.query(`
        UPDATE monitors 
        SET next_run_at = NOW() + ($1 * INTERVAL '1 second')
        WHERE id = $2
      `, [monitor.frequency_seconds, monitor.id]);

      // 5. DISPATCH THE WORKER (The "Event" part)
      // We do NOT use 'await' here. We want this to run in the background.
      console.log(`📦 [Scheduler] Dispatching analysis for: ${monitor.url}`);
      
      analyzeWebsite(executionId, monitor.id, monitor.url)
        .catch(err => console.error(`❌ [Background Error] ${monitor.url}:`, err.message));
    }

  } catch (error) {
    console.error("❌ [Scheduler Error]:", error);
  }
}

export function startScheduler() {
  // Runs every minute based on your .env or default
  const schedule = process.env.CRON_SCHEDULE || "* * * * *";
  cron.schedule(schedule, processDueMonitors);
  console.log(`📅 Scheduler active (${schedule}). Scanning database for due tasks...`);
}