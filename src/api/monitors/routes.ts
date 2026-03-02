import { FastifyInstance } from "fastify";
import { db } from "../../db/client";

export async function monitorRoutes(app: FastifyInstance) {
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
        return reply.status(400).send({ error: "Invalid URL format. Must include http:// or https://" });
    }

    try {
        const result = await db.query(
            `INSERT INTO monitors (url, frequency_seconds, next_run_at, customer_email) 
             VALUES ($1, $2, NOW(), $3) 
             ON CONFLICT (url) 
             DO UPDATE SET 
               frequency_seconds = EXCLUDED.frequency_seconds,
               customer_email = EXCLUDED.customer_email,
               updated_at = NOW()
             RETURNING *`,
            [url, frequency_seconds, customer_email]
          );

      const newMonitor = result.rows[0];

      return reply.status(201).send({
        message: "Monitor scheduled successfully",
        monitor: newMonitor,
      });
    } catch (error) {
      console.error("Error inserting monitor:", error);
      return reply.status(500).send({ error: "Internal Server Error" });
    }
  });
}