import { query } from "../db/pool.js";
import { parseMonthQuery } from "./month-query.js";
import { TZ } from "../utils/timezone.js";

export type SubscriptionPlan = "free" | "essencial" | "pro";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "incomplete";

export interface UserSubscription {
  id: number;
  stripe_customer_id: string | null;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  subscription_expires_at: Date | null;
  subscription_stripe_id: string | null;
  phone: string;
  name: string | null;
}

export interface UsageCounter {
  expenses_this_month: number;
  income_this_month: number;
  month_key: string;
}

export const PLAN_LIMITS = {
  free: { expenses: 30, income: 10 },
  essencial: { expenses: null, income: null },
  pro: { expenses: null, income: null },
} as const;

export const PLAN_ORDER: SubscriptionPlan[] = ["free", "essencial", "pro"];

export function getCurrentMonthKey(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

export function checkPlanAccess(
  plan: string,
  status: string,
  minPlan: SubscriptionPlan,
  expiresAt?: Date | null
): boolean {
  const planIndex = PLAN_ORDER.indexOf(plan as SubscriptionPlan);
  const minIndex = PLAN_ORDER.indexOf(minPlan);
  if (planIndex < 0 || planIndex < minIndex) return false;

  if (status === "active") return true;
  if (status === "canceled" && expiresAt && expiresAt > new Date()) return true;
  return false;
}

export function hasPaidAccess(
  plan: string,
  status: string,
  expiresAt?: Date | null
): boolean {
  if (plan === "free") return false;
  return checkPlanAccess(plan, status, "essencial", expiresAt);
}

export async function getUserSubscription(
  userId: number
): Promise<UserSubscription | null> {
  const result = await query<UserSubscription>(
    `SELECT id, stripe_customer_id, subscription_plan, subscription_status,
            subscription_expires_at, subscription_stripe_id, phone, name
     FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function getUserByStripeCustomerId(
  customerId: string
): Promise<UserSubscription | null> {
  const result = await query<UserSubscription>(
    `SELECT id, stripe_customer_id, subscription_plan, subscription_status,
            subscription_expires_at, subscription_stripe_id, phone, name
     FROM users WHERE stripe_customer_id = $1`,
    [customerId]
  );
  return result.rows[0] ?? null;
}

export async function setStripeCustomerId(
  userId: number,
  customerId: string
): Promise<void> {
  await query(
    `UPDATE users SET stripe_customer_id = $2 WHERE id = $1`,
    [userId, customerId]
  );
}

export async function updateUserSubscription(
  userId: number,
  updates: {
    plan?: SubscriptionPlan;
    status?: SubscriptionStatus;
    expiresAt?: Date | null;
    stripeSubscriptionId?: string | null;
  }
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [userId];
  let idx = 2;

  if (updates.plan !== undefined) {
    sets.push(`subscription_plan = $${idx++}`);
    params.push(updates.plan);
  }
  if (updates.status !== undefined) {
    sets.push(`subscription_status = $${idx++}`);
    params.push(updates.status);
  }
  if (updates.expiresAt !== undefined) {
    sets.push(`subscription_expires_at = $${idx++}`);
    params.push(updates.expiresAt);
  }
  if (updates.stripeSubscriptionId !== undefined) {
    sets.push(`subscription_stripe_id = $${idx++}`);
    params.push(updates.stripeSubscriptionId);
  }

  if (sets.length === 0) return;

  await query(`UPDATE users SET ${sets.join(", ")} WHERE id = $1`, params);
}

export async function getOrCreateUsageCounter(
  userId: number
): Promise<UsageCounter> {
  const monthKey = getCurrentMonthKey();

  const existing = await query<UsageCounter>(
    `SELECT expenses_this_month, income_this_month, month_key
     FROM usage_counters WHERE user_id = $1`,
    [userId]
  );

  if (existing.rows[0]) {
    if (existing.rows[0].month_key !== monthKey) {
      await query(
        `UPDATE usage_counters
         SET expenses_this_month = 0, income_this_month = 0,
             month_key = $2, updated_at = NOW()
         WHERE user_id = $1`,
        [userId, monthKey]
      );
      return { expenses_this_month: 0, income_this_month: 0, month_key: monthKey };
    }
    return existing.rows[0];
  }

  await query(
    `INSERT INTO usage_counters (user_id, expenses_this_month, income_this_month, month_key)
     VALUES ($1, 0, 0, $2)
     ON CONFLICT (user_id) DO UPDATE
       SET expenses_this_month = 0, income_this_month = 0,
           month_key = EXCLUDED.month_key, updated_at = NOW()`,
    [userId, monthKey]
  );

  return { expenses_this_month: 0, income_this_month: 0, month_key: monthKey };
}

export async function incrementUsageCounter(
  userId: number,
  type: "expense" | "income",
  count = 1
): Promise<void> {
  await getOrCreateUsageCounter(userId);
  const column = type === "expense" ? "expenses_this_month" : "income_this_month";
  await query(
    `UPDATE usage_counters SET ${column} = ${column} + $2, updated_at = NOW() WHERE user_id = $1`,
    [userId, count]
  );
}

/** Contagens reais no banco — só para bootstrap inicial do contador. */
async function getMonthlyRegistrationCounts(userId: number): Promise<{
  expenses: number;
  income: number;
}> {
  const monthKey = getCurrentMonthKey();
  const [year, month] = monthKey.split("-").map(Number);
  const range = parseMonthQuery(year, month)!;

  const [expResult, incResult] = await Promise.all([
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM expenses
       WHERE user_id = $1
         AND expense_date >= $2::date
         AND expense_date <= $3::date`,
      [userId, range.startDate, range.endDate]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM income
       WHERE user_id = $1
         AND income_date >= $2::date
         AND income_date <= $3::date`,
      [userId, range.startDate, range.endDate]
    ),
  ]);

  return {
    expenses: parseInt(expResult.rows[0]?.count ?? "0", 10),
    income: parseInt(incResult.rows[0]?.count ?? "0", 10),
  };
}

/**
 * Contador de registros do mês — nunca diminui ao excluir despesas/receitas.
 * Faz bootstrap uma vez se houver registros antigos não contabilizados.
 */
export async function getLimitUsageCounts(userId: number): Promise<{
  expenses: number;
  income: number;
}> {
  let counter = await getOrCreateUsageCounter(userId);
  const db = await getMonthlyRegistrationCounts(userId);

  if (
    db.expenses > counter.expenses_this_month ||
    db.income > counter.income_this_month
  ) {
    await query(
      `UPDATE usage_counters
       SET expenses_this_month = GREATEST(expenses_this_month, $2),
           income_this_month = GREATEST(income_this_month, $3),
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId, db.expenses, db.income]
    );
    counter = (await getOrCreateUsageCounter(userId));
  }

  return {
    expenses: counter.expenses_this_month,
    income: counter.income_this_month,
  };
}

export async function consumeUsageLimit(
  userId: number,
  type: "expense" | "income",
  count = 1
): Promise<{ ok: true } | { ok: false; limit: number }> {
  const user = await getUserSubscription(userId);
  if (!user) return { ok: true };

  if (hasPaidAccess(user.subscription_plan, user.subscription_status, user.subscription_expires_at)) {
    return { ok: true };
  }

  const limits = PLAN_LIMITS.free;
  const max = type === "expense" ? limits.expenses! : limits.income!;
  const usage = await getLimitUsageCounts(userId);
  const current = type === "expense" ? usage.expenses : usage.income;

  if (current + count > max) {
    return { ok: false, limit: max };
  }

  await incrementUsageCounter(userId, type, count);
  return { ok: true };
}

export function getUsageLimits(plan: SubscriptionPlan): {
  expenses: number | null;
  income: number | null;
} {
  return PLAN_LIMITS[plan];
}
