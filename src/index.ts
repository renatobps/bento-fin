import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { pool } from "./db/pool.js";
import { webhookRouter } from "./routes/webhook.js";
import { authRouter } from "./routes/auth.js";
import { apiRouter } from "./routes/api.js";
import { adminRouter } from "./routes/admin.js";
import { stripeWebhookRouter } from "./routes/stripe.js";
import { sendBillingReminders } from "./services/billing-reminder.js";

const app = express();
const isProduction = process.env.NODE_ENV === "production";

// Necessário para que req.ip use o X-Forwarded-For do proxy do EasyPanel.
// Sem isso os limites por IP são forjáveis pelo próprio cliente.
app.set("trust proxy", 1);

app.disable("x-powered-by");
app.use(
  helmet({
    // API JSON: não serve HTML, então a CSP padrão não agrega e complica CORS.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Conveniência de desenvolvimento: acessar o dashboard pelo IP da rede local.
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

      if (!isProduction && LAN_DASHBOARD_ORIGIN.test(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
  })
);

app.use(express.urlencoded({ extended: false, limit: "512kb" }));
app.use("/webhook", express.json({ limit: "5mb" }));
app.use(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookRouter
);
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
app.use("/api/admin", adminRouter);
app.use("/api", apiRouter);

function msUntilNext9amBrasilia(): number {
  const TZ = "America/Sao_Paulo";
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  const second = get("second");

  const nowInTz = new Date(year, month - 1, day, hour, minute, second);
  let target = new Date(year, month - 1, day, 9, 0, 0, 0);

  if (nowInTz >= target) {
    target = new Date(year, month - 1, day + 1, 9, 0, 0, 0);
  }

  const offsetNow = now.getTime() - nowInTz.getTime();
  return target.getTime() + offsetNow - now.getTime();
}

function scheduleBillingReminders(): void {
  const run = () => {
    sendBillingReminders().catch((err) => {
      console.error("Erro ao enviar lembretes de fatura:", err);
    });
  };

  const initialDelay = msUntilNext9amBrasilia();
  console.log(
    `Lembretes de fatura agendados — próximo disparo em ${Math.round(initialDelay / 60000)} min`
  );

  setTimeout(() => {
    run();
    setInterval(run, 24 * 60 * 60 * 1000);
  }, initialDelay);
}

app.listen(env.port, () => {
  console.log(`Bento backend rodando na porta ${env.port}`);
  console.log(`Webhook: POST http://localhost:${env.port}/webhook`);
  console.log(`API: http://localhost:${env.port}/api`);
  scheduleBillingReminders();
});
