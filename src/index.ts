import { Blob } from 'node:buffer';

// Fix for Node 18.x environments where File is not globally defined
if (typeof global.File === 'undefined') {
  class File extends Blob {
    name: string;
    lastModified: number;
    constructor(parts: any[], filename: string, options?: any) {
      super(parts, options);
      this.name = filename;
      this.lastModified = options?.lastModified || Date.now();
    }
  }
  (global as any).File = File;
}

import "dotenv/config";
import Fastify from "fastify";
import { monitorRoutes } from "./api/monitors/routes";
import { db } from "./db/client";
import { startScheduler } from "./scheduler"; 

const app = Fastify();

app.register(monitorRoutes, { prefix: "/monitors" });

app.get("/health", async () => {
  return { status: "ok" };
});

db.query('SELECT NOW()')
  .then((res) => {
    console.log('✅ DB Connected! Time:', res.rows[0].now);
    startScheduler(); 
  })
  .catch((err) => console.error('❌ Erro crítico no banco:', err));

app.listen({ host: "0.0.0.0", port: Number(process.env.PORT) || 3000 })
  .then(() => console.log("Server running on port", process.env.PORT || 3000))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });