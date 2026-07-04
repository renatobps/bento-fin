import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { pool } from "./db/pool.js";
import { webhookRouter } from "./routes/webhook.js";
import { authRouter } from "./routes/auth.js";
import { apiRouter } from "./routes/api.js";

const app = express();

const LAN_DASHBOARD_ORIGIN =
  /^http:\/\/(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):3001$/;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      if (LAN_DASHBOARD_ORIGIN.test(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
  })
);

app.use(express.urlencoded({ extended: false, limit: "512kb" }));
app.use("/webhook", express.json({ limit: "5mb" }));
app.use(express.json({ limit: "512kb" }));

app.use(
  (
    err: Error & { status?: number; body?: unknown; type?: string },
    _req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (err.type === "entity.too.large") {
      res.status(413).json({ error: "Payload muito grande" });
      return;
    }
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
      res.status(400).json({ error: "JSON inválido" });
      return;
    }
    next(err);
  }
);

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
