import { query } from "../db/pool.js";
import type { ExpensePeriod } from "./expenses.js";
import { parseMonthQuery, getCurrentMonthRange, type MonthRange } from "./month-query.js";

export interface Income {
  id: number;
  user_id: number;
  amount: string;
  category_id: number;
  description: string | null;
  income_date: string;
  source: string;
  created_at?: string | Date;
}

export interface IncomeWithCategory extends Income {
  category_name: string;
  category_icon: string | null;
}

function getPeriodDateFilter(period: ExpensePeriod): string {
  switch (period) {
    case "hoje":
      return "i.income_date = CURRENT_DATE";
    case "semana":
      return "i.income_date >= date_trunc('week', CURRENT_DATE)::date AND i.income_date <= CURRENT_DATE";
    case "mes":
      return "i.income_date >= date_trunc('month', CURRENT_DATE)::date AND i.income_date <= CURRENT_DATE";
  }
}

export async function createIncome(params: {
  userId: number;
  amount: number;
  categoryId: number;
  description: string | null;
  incomeDate: string;
  source?: string;
}): Promise<Income> {
  const result = await query<Income>(
    `INSERT INTO income (user_id, amount, category_id, description, income_date, source)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, amount, category_id, description, income_date, source`,
    [
      params.userId,
      params.amount,
      params.categoryId,
      params.description,
      params.incomeDate,
      params.source ?? "text",
    ]
  );

  return result.rows[0];
}

export async function getIncomeForMonth(
  userId: number,
  startDate: string,
  endDate: string,
  options?: { limit?: number; offset?: number }
): Promise<IncomeWithCategory[]> {
  const params: unknown[] = [userId, startDate, endDate];
  let pagination = "";

  if (options?.limit !== undefined) {
    params.push(options.limit);
    pagination += ` LIMIT $${params.length}`;
  }
  if (options?.offset !== undefined) {
    params.push(options.offset);
    pagination += ` OFFSET $${params.length}`;
  }

  const result = await query<IncomeWithCategory>(
    `SELECT i.id, i.user_id, i.amount, i.category_id, i.description,
            i.income_date, i.source,
            (i.created_at AT TIME ZONE 'America/Sao_Paulo') AS created_at,
            c.name AS category_name, c.icon AS category_icon
     FROM income i
     JOIN income_categories c ON c.id = i.category_id
     WHERE i.user_id = $1
       AND i.income_date >= $2::date
       AND i.income_date <= $3::date
     ORDER BY i.income_date DESC, i.created_at DESC${pagination}`,
    params
  );

  return result.rows;
}

export function resolveMonthFromQuery(
  yearRaw: unknown,
  monthRaw: unknown
): MonthRange {
  return parseMonthQuery(yearRaw, monthRaw) ?? getCurrentMonthRange();
}

export async function getIncomeForPeriod(
  userId: number,
  period: ExpensePeriod
): Promise<IncomeWithCategory[]> {
  const dateFilter = getPeriodDateFilter(period);

  const result = await query<IncomeWithCategory>(
    `SELECT i.id, i.user_id, i.amount, i.category_id, i.description,
            i.income_date, i.source,
            (i.created_at AT TIME ZONE 'America/Sao_Paulo') AS created_at,
            c.name AS category_name, c.icon AS category_icon
     FROM income i
     JOIN income_categories c ON c.id = i.category_id
     WHERE i.user_id = $1 AND ${dateFilter}
     ORDER BY i.income_date DESC, i.created_at DESC`,
    [userId]
  );

  return result.rows;
}

export async function getTotalIncomeForPeriod(
  userId: number,
  period: ExpensePeriod
): Promise<number> {
  const dateFilter = getPeriodDateFilter(period);

  const result = await query<{ total: string | null }>(
    `SELECT COALESCE(SUM(i.amount), 0)::text AS total
     FROM income i
     WHERE i.user_id = $1 AND ${dateFilter}`,
    [userId]
  );

  return parseFloat(result.rows[0]?.total ?? "0");
}

export async function getIncomeById(
  incomeId: number,
  userId: number
): Promise<IncomeWithCategory | null> {
  const result = await query<IncomeWithCategory>(
    `SELECT i.id, i.user_id, i.amount, i.category_id, i.description,
            i.income_date, i.source,
            (i.created_at AT TIME ZONE 'America/Sao_Paulo') AS created_at,
            c.name AS category_name, c.icon AS category_icon
     FROM income i
     JOIN income_categories c ON c.id = i.category_id
     WHERE i.id = $1 AND i.user_id = $2`,
    [incomeId, userId]
  );
  return result.rows[0] ?? null;
}

export async function deleteIncome(
  incomeId: number,
  userId: number
): Promise<boolean> {
  const result = await query(
    "DELETE FROM income WHERE id = $1 AND user_id = $2 RETURNING id",
    [incomeId, userId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function updateIncome(
  incomeId: number,
  userId: number,
  updates: {
    amount?: number;
    categoryId?: number;
    description?: string | null;
    incomeDate?: string;
  }
): Promise<IncomeWithCategory | null> {
  const sets: string[] = [];
  const params: unknown[] = [incomeId, userId];
  let paramIndex = 3;

  if (updates.amount !== undefined) {
    sets.push(`amount = $${paramIndex++}`);
    params.push(updates.amount);
  }
  if (updates.categoryId !== undefined) {
    sets.push(`category_id = $${paramIndex++}`);
    params.push(updates.categoryId);
  }
  if (updates.description !== undefined) {
    sets.push(`description = $${paramIndex++}`);
    params.push(updates.description);
  }
  if (updates.incomeDate !== undefined) {
    sets.push(`income_date = $${paramIndex++}`);
    params.push(updates.incomeDate);
  }

  if (sets.length === 0) {
    return getIncomeById(incomeId, userId);
  }

  const result = await query<IncomeWithCategory>(
    `UPDATE income i
     SET ${sets.join(", ")}
     FROM income_categories c
     WHERE i.id = $1 AND i.user_id = $2 AND c.id = i.category_id
     RETURNING i.id, i.user_id, i.amount, i.category_id, i.description,
               i.income_date, i.source,
               (i.created_at AT TIME ZONE 'America/Sao_Paulo') AS created_at,
               c.name AS category_name, c.icon AS category_icon`,
    params
  );

  return result.rows[0] ?? null;
}
