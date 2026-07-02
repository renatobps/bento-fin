import { query } from "../db/pool.js";
import type { ExpensePeriod } from "./expenses.js";

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
