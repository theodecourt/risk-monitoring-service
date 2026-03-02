import "dotenv/config";
import Fastify from "fastify";
import { monitorRoutes } from "./api/monitors/routes";
import { db } from "./db/client";
import { startScheduler } from "./scheduler"; // <-- Add this import

const app = Fastify();

app.register(monitorRoutes, { prefix: "/monitors" });

app.get("/health", async () => {
  return { status: "ok" };
});

db.query('SELECT NOW()')
  .then((res) => {
    console.log('✅ Banco conectado! Hora:', res.rows[0].now);
    // Start the scheduler only after confirming DB connection
    startScheduler(); // <-- Add this line
  })
  .catch((err) => console.error('❌ Erro crítico no banco:', err));

app.listen({ host: "0.0.0.0", port: Number(process.env.PORT) || 3000 })
  .then(() => console.log("Server running on port", process.env.PORT || 3000))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });