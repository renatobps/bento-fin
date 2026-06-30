import { query } from "../db/pool.js";
import type { ExpensePeriod } from "./expenses.js";

export interface SpendingLimits {
  user_id: number;
  daily_limit: string | null;
  weekly_limit: string | null;
  monthly_limit: string | null;
  updated_at: string | Date;
}

export interface SpendingLimitsInput {
  dailyLimit: number | null;
  weeklyLimit: number | null;
  monthlyLimit: number | null;
}

export async function getSpendingLimits(
  userId: number
): Promise<SpendingLimits | null> {
  const result = await query<SpendingLimits>(
    `SELECT user_id, daily_limit, weekly_limit, monthly_limit, updated_at
     FROM spending_limits
     WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0] ?? null;
}

export async function upsertSpendingLimits(
  userId: number,
  limits: SpendingLimitsInput
): Promise<SpendingLimits> {
  const result = await query<SpendingLimits>(
    `INSERT INTO spending_limits (user_id, daily_limit, weekly_limit, monthly_limit, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       daily_limit = EXCLUDED.daily_limit,
       weekly_limit = EXCLUDED.weekly_limit,
       monthly_limit = EXCLUDED.monthly_limit,
       updated_at = NOW()
     RETURNING user_id, daily_limit, weekly_limit, monthly_limit, updated_at`,
    [userId, limits.dailyLimit, limits.weeklyLimit, limits.monthlyLimit]
  );

  return result.rows[0];
}

export async function wasLimitNotified(
  userId: number,
  periodType: ExpensePeriod,
  periodKey: string
): Promise<boolean> {
  const result = await query(
    `SELECT 1 FROM limit_notifications
     WHERE user_id = $1 AND period_type = $2 AND period_key = $3`,
    [userId, periodType, periodKey]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

export async function markLimitNotified(
  userId: number,
  periodType: ExpensePeriod,
  periodKey: string
): Promise<void> {
  await query(
    `INSERT INTO limit_notifications (user_id, period_type, period_key)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, period_type, period_key) DO NOTHING`,
    [userId, periodType, periodKey]
  );
}

export async function getPeriodKey(
  period: ExpensePeriod,
  referenceDate: string
): Promise<string> {
  const result = await query<{ period_key: string }>(
    `SELECT CASE
       WHEN $1 = 'hoje' THEN $2::date
       WHEN $1 = 'semana' THEN date_trunc('week', $2::date)::date
       ELSE date_trunc('month', $2::date)::date
     END::text AS period_key`,
    [period, referenceDate]
  );

  return result.rows[0].period_key.slice(0, 10);
}
