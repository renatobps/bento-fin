import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { env } from "../config/env.js";
import { adminAuthMiddleware } from "../middleware/admin-auth.js";
import {
  findAdminByEmail,
  verifyAdminPassword,
  createAdminSession,
  deleteAdminSession,
  getAdminById,
  getMetricsOverview,
  getRevenueHistory,
  getAiCostMetrics,
  listAdminUsers,
  getAdminUserDetail,
  blockUser,
  unblockUser,
  getAiLogs,
  getAiCostByIntent,
  getUserStripeSubscriptionId,
  markSubscriptionCanceled,
} from "../repositories/admin.js";
import { computeAiCostBrl } from "../utils/ai-cost.js";
import { RateLimiter, clientIp } from "../utils/rate-limit.js";

const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;
const loginByIp = new RateLimiter(5, LOGIN_RATE_WINDOW_MS);
/** Segunda trava: uma botnet troca de IP, mas o e-mail alvo continua o mesmo. */
const loginByEmail = new RateLimiter(10, LOGIN_RATE_WINDOW_MS);

function getStripe(): Stripe {
  if (!env.stripe.secretKey) throw new Error("Stripe não configurado");
  return new Stripe(env.stripe.secretKey);
}

export const adminRouter = Router();

adminRouter.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const ip = clientIp(req);
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email?.trim() || !password) {
      res.status(400).json({ error: "E-mail e senha são obrigatórios" });
      return;
    }

    const emailKey = email.trim().toLowerCase();
    if (!loginByIp.allows(ip) || !loginByEmail.allows(emailKey)) {
      res.status(429).json({ error: "Muitas tentativas. Aguarde 15 minutos." });
      return;
    }

    const admin = await findAdminByEmail(email);
    if (!admin) {
      loginByIp.record(ip);
      loginByEmail.record(emailKey);
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    const valid = await verifyAdminPassword(admin.admin_password_hash, password);
    if (!valid) {
      loginByIp.record(ip);
      loginByEmail.record(emailKey);
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    loginByIp.reset(ip);
    loginByEmail.reset(emailKey);
    const session = await createAdminSession(admin.id);
    res.json({
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
      adminName: admin.name ?? admin.admin_email,
    });
  } catch (err) {
    console.error("Erro no login admin:", err);
    res.status(500).json({ error: "Falha no login" });
  }
});

adminRouter.post("/auth/logout", adminAuthMiddleware, async (req: Request, res: Response) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    await deleteAdminSession(header.slice(7));
  }
  res.json({ ok: true });
});

adminRouter.get("/auth/me", adminAuthMiddleware, async (req: Request, res: Response) => {
  const admin = await getAdminById(req.adminId!);
  if (!admin) {
    res.status(404).json({ error: "Admin não encontrado" });
    return;
  }
  res.json({
    id: admin.id,
    name: admin.name,
    email: admin.admin_email,
  });
});

adminRouter.use(adminAuthMiddleware);

adminRouter.get("/metrics/overview", async (_req, res) => {
  try {
    res.json(await getMetricsOverview());
  } catch (err) {
    console.error("Erro metrics overview:", err);
    res.status(500).json({ error: "Falha ao buscar métricas" });
  }
});

adminRouter.get("/metrics/revenue", async (req, res) => {
  try {
    const months = Math.min(parseInt(String(req.query.months ?? "6"), 10) || 6, 24);
    res.json(await getRevenueHistory(months));
  } catch (err) {
    console.error("Erro metrics revenue:", err);
    res.status(500).json({ error: "Falha ao buscar receita" });
  }
});

adminRouter.get("/metrics/ai-cost", async (req, res) => {
  try {
    const period = req.query.period === "week" ? "week" : "month";
    const data = await getAiCostMetrics(period);
    const byIntent = await getAiCostByIntent();
    res.json({ ...data, byIntent });
  } catch (err) {
    console.error("Erro metrics ai-cost:", err);
    res.status(500).json({ error: "Falha ao buscar custo de IA" });
  }
});

adminRouter.get("/users", async (req, res) => {
  try {
    const page = Math.max(parseInt(String(req.query.page ?? "1"), 10) || 1, 1);
    const pageSize = Math.min(parseInt(String(req.query.pageSize ?? "20"), 10) || 20, 100);
    const data = await listAdminUsers({
      page,
      pageSize,
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      plan: typeof req.query.plan === "string" ? req.query.plan : undefined,
      status: typeof req.query.status === "string" ? req.query.status : undefined,
    });
    res.json(data);
  } catch (err) {
    console.error("Erro list users:", err);
    res.status(500).json({ error: "Falha ao listar usuários" });
  }
});

adminRouter.get("/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!Number.isFinite(userId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const user = await getAdminUserDetail(userId);
    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    res.json(user);
  } catch (err) {
    console.error("Erro user detail:", err);
    res.status(500).json({ error: "Falha ao buscar usuário" });
  }
});

adminRouter.post("/users/:id/block", async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { reason } = req.body as { reason?: string };
    if (!reason?.trim()) {
      res.status(400).json({ error: "Motivo é obrigatório" });
      return;
    }
    const ok = await blockUser(userId, req.adminId!, reason.trim());
    if (!ok) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Erro block user:", err);
    res.status(500).json({ error: "Falha ao bloquear usuário" });
  }
});

adminRouter.post("/users/:id/unblock", async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const ok = await unblockUser(userId, req.adminId!);
    if (!ok) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Erro unblock user:", err);
    res.status(500).json({ error: "Falha ao desbloquear usuário" });
  }
});

adminRouter.post("/users/:id/cancel-subscription", async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const subId = await getUserStripeSubscriptionId(userId);
    if (!subId) {
      res.status(400).json({ error: "Usuário sem assinatura Stripe ativa" });
      return;
    }

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.cancel(subId);
    const raw = subscription as Stripe.Subscription & { current_period_end?: number };
    const expiresAt = typeof raw.current_period_end === "number"
      ? new Date(raw.current_period_end * 1000)
      : new Date();

    await markSubscriptionCanceled(userId, req.adminId!, expiresAt);
    res.json({ ok: true, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    console.error("Erro cancel subscription:", err);
    res.status(500).json({ error: "Falha ao cancelar assinatura" });
  }
});

adminRouter.get("/ai-logs", async (req, res) => {
  try {
    const page = Math.max(parseInt(String(req.query.page ?? "1"), 10) || 1, 1);
    const pageSize = Math.min(parseInt(String(req.query.pageSize ?? "50"), 10) || 50, 200);
    const userId = req.query.userId ? parseInt(String(req.query.userId), 10) : undefined;

    const data = await getAiLogs({
      page,
      pageSize,
      userId: Number.isFinite(userId) ? userId : undefined,
      intent: typeof req.query.intent === "string" ? req.query.intent : undefined,
      from: typeof req.query.from === "string" ? req.query.from : undefined,
      to: typeof req.query.to === "string" ? req.query.to : undefined,
    });

    if (req.query.format === "csv") {
      const header = "id,userId,messageType,detectedIntent,intentSource,inputTokens,outputTokens,costBrl,success,createdAt\n";
      const rows = data.logs
        .map((l) =>
          [l.id, l.userId, l.messageType, l.detectedIntent ?? "", l.intentSource ?? "", l.inputTokens, l.outputTokens, l.costBrl, l.processedSuccessfully, l.createdAt].join(",")
        )
        .join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=ai-logs.csv");
      res.send(header + rows);
      return;
    }

    res.json(data);
  } catch (err) {
    console.error("Erro ai logs:", err);
    res.status(500).json({ error: "Falha ao buscar logs" });
  }
});
