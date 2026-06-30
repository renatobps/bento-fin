import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { pool } from "./db/pool.js";
import { webhookRouter } from "./routes/webhook.js";
import { authRouter } from "./routes/auth.js";
import { apiRouter } from "./routes/api.js";

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", service: "bento-fin" });
  } catch {
    res.status(503).json({ status: "error", message: "Banco indisponível" });
  }
});

app.use("/webhook", webhookRouter);
app.use("/api/auth", authRouter);
app.use("/api", apiRouter);

app.listen(env.port, () => {
  console.log(`Bento backend rodando na porta ${env.port}`);
  console.log(`Webhook: POST http://localhost:${env.port}/webhook`);
  console.log(`API: http://localhost:${env.port}/api`);
});
