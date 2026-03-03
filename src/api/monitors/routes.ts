import { FastifyInstance } from "fastify";
import { db } from "../../db/client";

export async function monitorRoutes(app: FastifyInstance) {
  // POST
  app.post("/", async (request, reply) => {
    const { url, frequency_seconds, customer_email } = request.body as {
      url: string;
      frequency_seconds: number;
      customer_email?: string;
    };

    if (!url || !frequency_seconds) {
      return reply.status(400).send({ error: "url and frequency_seconds are required" });
    }

    try {
      new URL(url);
    } catch (err) {
      return reply.status(400).send({ error: "Invalid URL format" });
    }

    try {
      const result = await db.query(
        `INSERT INTO monitors (url, frequency_seconds, next_run_at, customer_email) 
         VALUES ($1, $2, NOW(), $3) 
         ON CONFLICT (url) DO UPDATE SET 
           frequency_seconds = EXCLUDED.frequency_seconds,
           customer_email = EXCLUDED.customer_email,
           updated_at = NOW(),
           is_active = true
         RETURNING *`,
        [url, frequency_seconds, customer_email]
      );
      return reply.status(201).send(result.rows[0]);
    } catch (error) {
      return reply.status(500).send({ error: "Internal Server Error" });
    }
  });

  // GET: List all monitors 
  app.get("/", async (request, reply) => {
    try {
      const result = await db.query("SELECT * FROM monitors ORDER BY created_at DESC");
      return reply.send(result.rows);
    } catch (error) {
      return reply.status(500).send({ error: "Failed to fetch monitors" });
    }
  });

  // GET: Get specific monitor details + History
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const monitor = await db.query("SELECT * FROM monitors WHERE id = $1", [id]);
      if (monitor.rows.length === 0) return reply.status(404).send({ error: "Not found" });

      const history = await db.query(
        "SELECT * FROM executions WHERE monitor_id = $1 ORDER BY started_at DESC LIMIT 5",
        [id]
      );

      return reply.send({
        ...monitor.rows[0],
        recent_executions: history.rows
      });
    } catch (error) {
      return reply.status(500).send({ error: "Error fetching details" });
    }
  });

  // DELETE
  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const result = await db.query("DELETE FROM monitors WHERE id = $1 RETURNING id", [id]);
      
      if (result.rows.length === 0) {
        return reply.status(404).send({ error: "Monitor not found" });
      }

      return reply.send({ message: "Monitor deleted successfully", id });
    } catch (error) {
      return reply.status(500).send({ error: "Delete failed" });
    }
  });
}