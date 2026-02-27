import Fastify from "fastify";
import dotenv from "dotenv";

dotenv.config();

const app = Fastify();

app.get("/health", async () => {
  return { status: "ok" };
});

app.listen({ host: "0.0.0.0", port: Number(process.env.PORT) || 3000 })
  .then(() => console.log("Server running"))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });