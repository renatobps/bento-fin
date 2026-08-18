import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { query } from "../db/pool.js";
import { env } from "../config/env.js";
import { maskPhone } from "../utils/admin-phone.js";
import { AI_COST_BRL_SQL, computeAiCostBrl } from "../utils/ai-cost.js";
import { getCurrentMonthKey } from "../repositories/subscription.js";
import { TZ } from "../utils/timezone.js";

const ESSENCIAL_PRICE = 14.9;
const PRO_PRICE = 24.9;

const PAID_ACTIVE_SQL = `
  subscription_plan IN ('essencial', 'pro')
  AND (
    subscription_status = 'active'
    OR (subscription_status = 'canceled' AND subscription_expires_at > NOW())
  )
`;

export interface AdminUser {
  id: number;
  name: string | null;
  admin_email: string;
  is_admin: boolean;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function getTodayInTz(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function findAdminByEmail(email: string) {
  const result = await query<{
    id: number;
    name: string | null;
    admin_email: string;
    admin_password_hash: string;
  }>(
    `SELECT id, name, admin_email, admin_password_hash
     FROM users WHERE admin_email = $1 AND is_admin = true`,
    [email.trim().toLowerCase()]
  );
  return result.rows[0] ?? null;
}

export async function verifyAdminPassword(hash: string, password: string) {
  return bcrypt.compare(password, hash);
}

export async function hashAdminPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function createAdminSession(adminId: number) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const hours = env.admin.sessionDurationHours;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  await query(
    `INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [adminId, tokenHash, expiresAt]
  );
  return { token, expiresAt };
}

export async function deleteAdminSession(token: string) {
  await query(`DELETE FROM admin_sessions WHERE token_hash = $1`, [hashToken(token)]);
}

export async function validateAdminSession(token: string) {
  const result = await query<{ admin_id: number }>(
    `SELECT admin_id FROM admin_sessions WHERE token_hash = $1 AND expires_at > NOW()`,
    [hashToken(token)]
  );
  return result.rows[0]?.admin_id ?? null;
}

export async function getAdminById(adminId: number) {
  const result = await query<AdminUser>(
    `SELECT id, name, admin_email, is_admin FROM users WHERE id = $1 AND is_admin = true`,
    [adminId]
  );
  return result.rows[0] ?? null;
}

export async function createAdminUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}) {
  const phone = `admin_${Date.now()}`;
  const result = await query<{ id: number }>(
    `INSERT INTO users (name, phone, admin_email, admin_password_hash, is_admin)
     VALUES ($1, $2, $3, $4, true) RETURNING id`,
    [input.name, phone, input.email.trim().toLowerCase(), input.passwordHash]
  );
  return result.rows[0].id;
}

export async function logAdminAction(
  adminId: number,
  action: string,
  targetUserId?: number,
  details?: Record<string, unknown>
) {
  await query(
    `INSERT INTO admin_actions (admin_id, action, target_user_id, details) VALUES ($1, $2, $3, $4)`,
    [adminId, action, targetUserId ?? null, details ? JSON.stringify(details) : null]
  );
}

export async function isUserBlocked(userId: number) {
  const result = await query<{ is_blocked: boolean }>(
    `SELECT COALESCE(is_blocked, false) AS is_blocked FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0]?.is_blocked ?? false;
}

export async function updateUserLastSeen(userId: number) {
  await query(`UPDATE users SET last_seen_at = NOW() WHERE id = $1`, [userId]);
}

async function countPaidAtDate(endDate: string) {
  const result = await query<{ plan: string; count: string }>(
    `SELECT subscription_plan AS plan, COUNT(*)::text AS count FROM users
     WHERE subscription_plan IN ('essencial', 'pro') AND created_at::date <= $1::date
       AND (subscription_status = 'active'
         OR (subscription_status = 'canceled' AND subscription_expires_at > $1::timestamp))
     GROUP BY subscription_plan`,
    [endDate]
  );
  let essencial = 0;
  let pro = 0;
  for (const row of result.rows) {
    const n = parseInt(row.count, 10);
    if (row.plan === "essencial") essencial = n;
    if (row.plan === "pro") pro = n;
  }
  return { essencial, pro };
}

function mrrFromCounts(essencial: number, pro: number) {
  return essencial * ESSENCIAL_PRICE + pro * PRO_PRICE;
}

export async function getMetricsOverview() {
  const monthKey = getCurrentMonthKey();
  const today = getTodayInTz();
  const counts = await query<{
    total_users: string;
    free_users: string;
    essencial_users: string;
    pro_users: string;
    active_subscribers: string;
    new_users_today: string;
    new_users_month: string;
    churn_month: string;
  }>(
    `SELECT COUNT(*)::text AS total_users,
       COUNT(*) FILTER (WHERE subscription_plan = 'free')::text AS free_users,
       COUNT(*) FILTER (WHERE subscription_plan = 'essencial' AND (${PAID_ACTIVE_SQL.replace(/subscription_plan IN \('essencial', 'pro'\)\s*AND\s*/, "")}))::text AS essencial_users,
       COUNT(*) FILTER (WHERE subscription_plan = 'pro' AND (${PAID_ACTIVE_SQL.replace(/subscription_plan IN \('essencial', 'pro'\)\s*AND\s*/, "")}))::text AS pro_users,
       COUNT(*) FILTER (WHERE ${PAID_ACTIVE_SQL})::text AS active_subscribers,
       COUNT(*) FILTER (WHERE created_at::date = $1::date)::text AS new_users_today,
       COUNT(*) FILTER (WHERE TO_CHAR(created_at AT TIME ZONE '${TZ}', 'YYYY-MM') = $2)::text AS new_users_month,
       COUNT(*) FILTER (WHERE subscription_status = 'canceled' AND TO_CHAR(subscription_expires_at AT TIME ZONE '${TZ}', 'YYYY-MM') = $2)::text AS churn_month
     FROM users WHERE COALESCE(is_admin, false) = false`,
    [today, monthKey]
  );
  const row = counts.rows[0];
  const essencialUsers = parseInt(row.essencial_users, 10);
  const proUsers = parseInt(row.pro_users, 10);
  const activeSubscribers = parseInt(row.active_subscribers, 10);
  const mrr = mrrFromCounts(essencialUsers, proUsers);
  const churnThisMonth = parseInt(row.churn_month, 10);
  const subscribersStart = Math.max(activeSubscribers + churnThisMonth, activeSubscribers);
  const churnRate = subscribersStart > 0 ? (churnThisMonth / subscribersStart) * 100 : 0;
  const aiResult = await query<{ total_cost: string; user_count: string }>(
    `SELECT COALESCE(SUM(${AI_COST_BRL_SQL}), 0)::text AS total_cost,
            COUNT(DISTINCT user_id)::text AS user_count FROM messages_log
     WHERE TO_CHAR(created_at AT TIME ZONE '${TZ}', 'YYYY-MM') = $1`,
    [monthKey]
  );
  const totalAiCost = parseFloat(aiResult.rows[0]?.total_cost ?? "0");
  const aiUsers = parseInt(aiResult.rows[0]?.user_count ?? "0", 10);
  return {
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(mrr * 12 * 100) / 100,
    totalUsers: parseInt(row.total_users, 10),
    activeSubscribers,
    freeUsers: parseInt(row.free_users, 10),
    essencialUsers,
    proUsers,
    newUsersToday: parseInt(row.new_users_today, 10),
    newUsersThisMonth: parseInt(row.new_users_month, 10),
    churnThisMonth,
    churnRate: Math.round(churnRate * 100) / 100,
    avgRevenuePerUser: activeSubscribers > 0 ? Math.round((mrr / activeSubscribers) * 100) / 100 : 0,
    totalAiCostThisMonth: Math.round(totalAiCost * 100) / 100,
    avgAiCostPerUser: aiUsers > 0 ? Math.round((totalAiCost / aiUsers) * 100) / 100 : 0,
  };
}

export async function getRevenueHistory(months: number) {
  const history = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = d.toISOString().slice(0, 7);
    const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
    const paid = await countPaidAtDate(endDate);
    const monthStats = await query<{ new_subs: string; churned: string }>(
      `SELECT COUNT(*) FILTER (WHERE subscription_plan IN ('essencial', 'pro') AND TO_CHAR(created_at AT TIME ZONE '${TZ}', 'YYYY-MM') = $1)::text AS new_subs,
              COUNT(*) FILTER (WHERE subscription_status = 'canceled' AND TO_CHAR(subscription_expires_at AT TIME ZONE '${TZ}', 'YYYY-MM') = $1)::text AS churned
       FROM users WHERE COALESCE(is_admin, false) = false`,
      [monthKey]
    );
    history.push({
      month: monthKey,
      mrr: Math.round(mrrFromCounts(paid.essencial, paid.pro) * 100) / 100,
      newSubscribers: parseInt(monthStats.rows[0]?.new_subs ?? "0", 10),
      churned: parseInt(monthStats.rows[0]?.churned ?? "0", 10),
      essencial: paid.essencial,
      pro: paid.pro,
    });
  }
  return history;
}

export async function getAiCostMetrics(period: "month" | "week" = "month") {
  const monthKey = getCurrentMonthKey();
  const periodFilter = period === "month"
    ? `TO_CHAR(created_at AT TIME ZONE '${TZ}', 'YYYY-MM') = $1`
    : `created_at >= NOW() - INTERVAL '7 days'`;
  const totals = await query<{
    input_tokens: string;
    output_tokens: string;
    total_cost_usd: string;
    total_cost_brl: string;
    user_count: string;
  }>(
    `SELECT COALESCE(SUM(COALESCE(input_tokens, 0)), 0)::text AS input_tokens,
            COALESCE(SUM(COALESCE(output_tokens, 0)), 0)::text AS output_tokens,
            COALESCE(SUM(${AI_COST_BRL_SQL} / ${env.ai.usdToBrlRate}), 0)::text AS total_cost_usd,
            COALESCE(SUM(${AI_COST_BRL_SQL}), 0)::text AS total_cost_brl,
            COUNT(DISTINCT user_id)::text AS user_count FROM messages_log WHERE ${periodFilter}`,
    period === "month" ? [monthKey] : []
  );
  const t = totals.rows[0];
  const userCount = parseInt(t.user_count, 10);
  const totalCostBrl = parseFloat(t.total_cost_brl);
  const topConsumers = await query<{ user_id: number; phone: string; cost_brl: string; messages: string }>(
    `SELECT m.user_id, u.phone, COALESCE(SUM(${AI_COST_BRL_SQL}), 0)::text AS cost_brl, COUNT(*)::text AS messages
     FROM messages_log m JOIN users u ON u.id = m.user_id
     WHERE TO_CHAR(m.created_at AT TIME ZONE '${TZ}', 'YYYY-MM') = $1 AND COALESCE(u.is_admin, false) = false
     GROUP BY m.user_id, u.phone ORDER BY SUM(${AI_COST_BRL_SQL}) DESC LIMIT 10`,
    [monthKey]
  );
  const byDay = await query<{ date: string; cost_brl: string; messages: string }>(
    `SELECT TO_CHAR(created_at AT TIME ZONE '${TZ}', 'YYYY-MM-DD') AS date,
            COALESCE(SUM(${AI_COST_BRL_SQL}), 0)::text AS cost_brl, COUNT(*)::text AS messages
     FROM messages_log WHERE TO_CHAR(created_at AT TIME ZONE '${TZ}', 'YYYY-MM') = $1 GROUP BY 1 ORDER BY 1`,
    [monthKey]
  );
  return {
    totalInputTokens: parseInt(t.input_tokens, 10),
    totalOutputTokens: parseInt(t.output_tokens, 10),
    totalCostUsd: Math.round(parseFloat(t.total_cost_usd) * 100) / 100,
    totalCostBrl: Math.round(totalCostBrl * 100) / 100,
    avgCostPerUserBrl: userCount > 0 ? Math.round((totalCostBrl / userCount) * 100) / 100 : 0,
    topConsumers: topConsumers.rows.map((r) => ({
      userId: r.user_id,
      phone: maskPhone(r.phone),
      costBrl: Math.round(parseFloat(r.cost_brl) * 100) / 100,
      messages: parseInt(r.messages, 10),
    })),
    byDay: byDay.rows.map((r) => ({
      date: r.date,
      costBrl: Math.round(parseFloat(r.cost_brl) * 100) / 100,
      messages: parseInt(r.messages, 10),
    })),
  };
}

export async function listAdminUsers(options: {
  page: number;
  pageSize: number;
  search?: string;
  plan?: string;
  status?: string;
}) {
  const { page, pageSize, search, plan, status } = options;
  const offset = (page - 1) * pageSize;
  const conditions: string[] = ["COALESCE(u.is_admin, false) = false"];
  const params: unknown[] = [];
  let idx = 1;
  if (search?.trim()) {
    conditions.push(`u.phone LIKE $${idx++}`);
    params.push(`%${search.replace(/\D/g, "")}%`);
  }
  if (plan && plan !== "all") {
    conditions.push(`u.subscription_plan = $${idx++}`);
    params.push(plan);
  }
  if (status === "blocked") {
    conditions.push(`u.is_blocked = true`);
  } else if (status && status !== "all") {
    conditions.push(`u.subscription_status = $${idx++}`);
    params.push(status);
  }
  const where = conditions.join(" AND ");
  const monthKey = getCurrentMonthKey();
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM users u WHERE ${where}`,
    params
  );
  const monthParam = idx++;
  params.push(monthKey, pageSize, offset);
  const usersResult = await query<{
    id: number;
    phone: string;
    name: string | null;
    plan: string;
    status: string;
    created_at: Date;
    last_seen_at: Date | null;
    expenses_all_time: string;
    messages_month: string;
    ai_cost_month: string;
    is_blocked: boolean;
  }>(
    `SELECT u.id, u.phone, u.name, u.subscription_plan AS plan, u.subscription_status AS status,
            u.created_at, u.last_seen_at,
            (SELECT COUNT(*)::text FROM expenses e WHERE e.user_id = u.id) AS expenses_all_time,
            (SELECT COUNT(*)::text FROM messages_log m WHERE m.user_id = u.id AND TO_CHAR(m.created_at AT TIME ZONE '${TZ}', 'YYYY-MM') = $${monthParam}) AS messages_month,
            (SELECT COALESCE(SUM(${AI_COST_BRL_SQL}), 0)::text FROM messages_log m WHERE m.user_id = u.id AND TO_CHAR(m.created_at AT TIME ZONE '${TZ}', 'YYYY-MM') = $${monthParam}) AS ai_cost_month,
            COALESCE(u.is_blocked, false) AS is_blocked
     FROM users u WHERE ${where} ORDER BY u.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    params
  );
  return {
    users: usersResult.rows.map((u) => ({
      id: u.id,
      phone: maskPhone(u.phone),
      name: u.name,
      plan: u.plan,
      status: u.is_blocked ? "blocked" : u.status,
      createdAt: u.created_at.toISOString().slice(0, 10),
      lastSeenAt: u.last_seen_at?.toISOString().slice(0, 10) ?? null,
      expensesAllTime: parseInt(u.expenses_all_time, 10),
      messagesThisMonth: parseInt(u.messages_month, 10),
      aiCostThisMonth: Math.round(parseFloat(u.ai_cost_month) * 100) / 100,
      isBlocked: u.is_blocked,
    })),
    total: parseInt(countResult.rows[0].count, 10),
    page,
    pageSize,
  };
}

export async function getAdminUserDetail(userId: number) {
  const userResult = await query<{
    id: number;
    phone: string;
    name: string | null;
    subscription_plan: string;
    subscription_status: string;
    subscription_expires_at: Date | null;
    created_at: Date;
    last_seen_at: Date | null;
    is_blocked: boolean;
    blocked_reason: string | null;
    stripe_subscription_id: string | null;
  }>(
    `SELECT id, phone, name, subscription_plan, subscription_status, subscription_expires_at,
            created_at, last_seen_at, is_blocked, blocked_reason, subscription_stripe_id AS stripe_subscription_id
     FROM users WHERE id = $1 AND COALESCE(is_admin, false) = false`,
    [userId]
  );
  const user = userResult.rows[0];
  if (!user) return null;
  const monthKey = getCurrentMonthKey();
  const stats = await query<{ expenses: string; messages_month: string; ai_cost_month: string }>(
    `SELECT (SELECT COUNT(*)::text FROM expenses WHERE user_id = $1) AS expenses,
            (SELECT COUNT(*)::text FROM messages_log WHERE user_id = $1 AND TO_CHAR(created_at AT TIME ZONE '${TZ}', 'YYYY-MM') = $2) AS messages_month,
            (SELECT COALESCE(SUM(${AI_COST_BRL_SQL}), 0)::text FROM messages_log WHERE user_id = $1 AND TO_CHAR(created_at AT TIME ZONE '${TZ}', 'YYYY-MM') = $2) AS ai_cost_month`,
    [userId, monthKey]
  );
  const cards = await query<{ name: string }>(`SELECT name FROM credit_cards WHERE user_id = $1 ORDER BY name`, [userId]);
  const intentHistory = await query<{
    date: string;
    detected_intent: string | null;
    intent_source: string | null;
    input_tokens: number | null;
    output_tokens: number | null;
    processed_successfully: boolean;
    created_at: Date;
  }>(
    `SELECT TO_CHAR(created_at AT TIME ZONE '${TZ}', 'YYYY-MM-DD') AS date, detected_intent, intent_source,
            input_tokens, output_tokens, processed_successfully, created_at
     FROM messages_log WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days' ORDER BY created_at DESC LIMIT 100`,
    [userId]
  );
  const messagesByDay = await query<{ date: string; count: string }>(
    `SELECT TO_CHAR(created_at AT TIME ZONE '${TZ}', 'YYYY-MM-DD') AS date, COUNT(*)::text AS count
     FROM messages_log WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days' GROUP BY 1 ORDER BY 1`,
    [userId]
  );
  const aiUsageByMonth = await query<{ month: string; cost_brl: string; messages: string }>(
    `SELECT TO_CHAR(created_at AT TIME ZONE '${TZ}', 'YYYY-MM') AS month, COALESCE(SUM(${AI_COST_BRL_SQL}), 0)::text AS cost_brl, COUNT(*)::text AS messages
     FROM messages_log WHERE user_id = $1 GROUP BY 1 ORDER BY 1 DESC LIMIT 12`,
    [userId]
  );
  const adminActions = await query<{ action: string; details: unknown; created_at: Date; admin_name: string | null }>(
    `SELECT a.action, a.details, a.created_at, u.name AS admin_name FROM admin_actions a
     LEFT JOIN users u ON u.id = a.admin_id WHERE a.target_user_id = $1 ORDER BY a.created_at DESC LIMIT 20`,
    [userId]
  );
  const s = stats.rows[0];
  return {
    id: user.id,
    phone: maskPhone(user.phone),
    name: user.name,
    subscription: {
      plan: user.subscription_plan,
      status: user.subscription_status,
      expiresAt: user.subscription_expires_at?.toISOString() ?? null,
    },
    createdAt: user.created_at.toISOString().slice(0, 10),
    lastSeenAt: user.last_seen_at?.toISOString().slice(0, 10) ?? null,
    isBlocked: user.is_blocked,
    blockedReason: user.blocked_reason,
    stats: {
      expensesAllTime: parseInt(s.expenses, 10),
      messagesThisMonth: parseInt(s.messages_month, 10),
      aiCostThisMonth: Math.round(parseFloat(s.ai_cost_month) * 100) / 100,
    },
    creditCards: cards.rows.map((c) => c.name),
    messagesByDay: messagesByDay.rows.map((r) => ({ date: r.date, count: parseInt(r.count, 10) })),
    intentHistory: intentHistory.rows.map((r) => ({
      date: r.date,
      detectedIntent: r.detected_intent,
      intentSource: r.intent_source,
      inputTokens: r.input_tokens ?? 0,
      outputTokens: r.output_tokens ?? 0,
      costBrl: Math.round(computeAiCostBrl(r.input_tokens ?? 0, r.output_tokens ?? 0) * 10000) / 10000,
      processedSuccessfully: r.processed_successfully,
      createdAt: r.created_at.toISOString(),
    })),
    aiUsageByMonth: aiUsageByMonth.rows.map((r) => ({
      month: r.month,
      costBrl: Math.round(parseFloat(r.cost_brl) * 100) / 100,
      messages: parseInt(r.messages, 10),
    })),
    adminActions: adminActions.rows.map((a) => ({
      action: a.action,
      details: a.details,
      createdAt: a.created_at.toISOString(),
      adminName: a.admin_name,
    })),
    stripeSubscriptionId: user.stripe_subscription_id,
  };
}

export async function blockUser(userId: number, adminId: number, reason: string) {
  const result = await query(
    `UPDATE users SET is_blocked = true, blocked_reason = $2 WHERE id = $1 AND COALESCE(is_admin, false) = false`,
    [userId, reason]
  );
  if ((result.rowCount ?? 0) === 0) return false;
  await logAdminAction(adminId, "block_user", userId, { reason });
  return true;
}

export async function unblockUser(userId: number, adminId: number) {
  const result = await query(
    `UPDATE users SET is_blocked = false, blocked_reason = NULL WHERE id = $1 AND COALESCE(is_admin, false) = false`,
    [userId]
  );
  if ((result.rowCount ?? 0) === 0) return false;
  await logAdminAction(adminId, "unblock_user", userId);
  return true;
}

export async function getAiLogs(options: {
  userId?: number;
  page: number;
  pageSize: number;
  intent?: string;
  from?: string;
  to?: string;
}) {
  const { userId, page, pageSize, intent, from, to } = options;
  const offset = (page - 1) * pageSize;
  const conditions: string[] = ["1=1"];
  const params: unknown[] = [];
  let idx = 1;
  if (userId) { conditions.push(`m.user_id = $${idx++}`); params.push(userId); }
  if (intent) { conditions.push(`m.detected_intent = $${idx++}`); params.push(intent); }
  if (from) { conditions.push(`m.created_at >= $${idx++}::date`); params.push(from); }
  if (to) { conditions.push(`m.created_at < ($${idx++}::date + INTERVAL '1 day')`); params.push(to); }
  const where = conditions.join(" AND ");
  const countResult = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM messages_log m WHERE ${where}`, params);
  params.push(pageSize, offset);
  const logsResult = await query<{
    id: number;
    user_id: number;
    message_type: string;
    detected_intent: string | null;
    intent_source: string | null;
    input_tokens: number | null;
    output_tokens: number | null;
    processed_successfully: boolean;
    created_at: Date;
  }>(
    `SELECT m.id, m.user_id, m.message_type, m.detected_intent, m.intent_source, m.input_tokens, m.output_tokens, m.processed_successfully, m.created_at
     FROM messages_log m WHERE ${where} ORDER BY m.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    params
  );
  return {
    logs: logsResult.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      messageType: r.message_type,
      detectedIntent: r.detected_intent,
      intentSource: r.intent_source,
      inputTokens: r.input_tokens ?? 0,
      outputTokens: r.output_tokens ?? 0,
      costBrl: Math.round(computeAiCostBrl(r.input_tokens ?? 0, r.output_tokens ?? 0) * 10000) / 10000,
      processedSuccessfully: r.processed_successfully,
      createdAt: r.created_at.toISOString(),
    })),
    total: parseInt(countResult.rows[0].count, 10),
    page,
    pageSize,
  };
}

export async function getAiCostByIntent() {
  const monthKey = getCurrentMonthKey();
  const result = await query<{ intent: string; input_tokens: string; output_tokens: string; cost_brl: string; messages: string }>(
    `SELECT COALESCE(detected_intent, 'unknown') AS intent, COALESCE(SUM(COALESCE(input_tokens, 0)), 0)::text AS input_tokens,
            COALESCE(SUM(COALESCE(output_tokens, 0)), 0)::text AS output_tokens, COALESCE(SUM(${AI_COST_BRL_SQL}), 0)::text AS cost_brl, COUNT(*)::text AS messages
     FROM messages_log WHERE TO_CHAR(created_at AT TIME ZONE '${TZ}', 'YYYY-MM') = $1 GROUP BY 1 ORDER BY SUM(${AI_COST_BRL_SQL}) DESC`,
    [monthKey]
  );
  return result.rows.map((r) => ({
    intent: r.intent,
    inputTokens: parseInt(r.input_tokens, 10),
    outputTokens: parseInt(r.output_tokens, 10),
    costBrl: Math.round(parseFloat(r.cost_brl) * 100) / 100,
    messages: parseInt(r.messages, 10),
  }));
}

export async function getUserStripeSubscriptionId(userId: number) {
  const result = await query<{ subscription_stripe_id: string | null }>(
    `SELECT subscription_stripe_id FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0]?.subscription_stripe_id ?? null;
}

export async function markSubscriptionCanceled(userId: number, adminId: number, expiresAt: Date) {
  await query(
    `UPDATE users SET subscription_status = 'canceled', subscription_expires_at = $2 WHERE id = $1`,
    [userId, expiresAt]
  );
  await logAdminAction(adminId, "cancel_subscription", userId);
}
