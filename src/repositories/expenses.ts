import { query } from "../db/pool.js";

export interface Expense {
  id: number;
  user_id: number;
  amount: string;
  category_id: number;
  description: string | null;
  expense_date: string;
  source: string;
  payment_method?: string;
  card_name?: string | null;
}

export interface ExpenseWithCategory extends Expense {
  category_name: string;
  category_icon: string | null;
  created_at: string | Date;
  payment_method?: string;
  card_name?: string | null;
}

const EXPENSE_SELECT = `SELECT e.id, e.user_id, e.amount, e.category_id, e.description,
            e.expense_date, e.source, e.payment_method, e.card_name,
            (e.created_at AT TIME ZONE 'America/Sao_Paulo') AS created_at,
            c.name AS category_name, c.icon AS category_icon`;

export async function getExpensesForMonth(
  userId: number,
  startDate: string,
  endDate: string,
  options?: { paymentMethod?: string; limit?: number; offset?: number }
): Promise<ExpenseWithCategory[]> {
  const params: unknown[] = [userId, startDate, endDate];
  let paymentFilter = "";

  if (options?.paymentMethod) {
    params.push(options.paymentMethod);
    paymentFilter = ` AND e.payment_method = $${params.length}`;
  }

  let pagination = "";
  if (options?.limit !== undefined) {
    params.push(options.limit);
    pagination += ` LIMIT $${params.length}`;
  }
  if (options?.offset !== undefined) {
    params.push(options.offset);
    pagination += ` OFFSET $${params.length}`;
  }

  const result = await query<ExpenseWithCategory>(
    `${EXPENSE_SELECT}
     FROM expenses e
     JOIN categories c ON c.id = e.category_id
     WHERE e.user_id = $1
       AND e.expense_date >= $2::date
       AND e.expense_date <= $3::date
       ${paymentFilter}
     ORDER BY e.expense_date DESC, e.created_at DESC${pagination}`,
    params
  );

  return result.rows;
}

export async function createExpense(params: {
  userId: number;
  amount: number;
  categoryId: number;
  description: string | null;
  expenseDate: string;
  source?: string;
  paymentMethod?: string;
  cardName?: string | null;
}): Promise<Expense> {
  const result = await query<Expense>(
    `INSERT INTO expenses (user_id, amount, category_id, description, expense_date, source, payment_method, card_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, user_id, amount, category_id, description, expense_date, source, payment_method, card_name`,
    [
      params.userId,
      params.amount,
      params.categoryId,
      params.description,
      params.expenseDate,
      params.source ?? "text",
      params.paymentMethod ?? "dinheiro",
      params.cardName ?? null,
    ]
  );

  return result.rows[0];
}

export type ExpensePeriod = "hoje" | "semana" | "mes";

function getPeriodDateFilter(period: ExpensePeriod, referenceDate?: string): string {
  const refExpr = referenceDate ? `$2::date` : "CURRENT_DATE";

  switch (period) {
    case "hoje":
      return referenceDate
        ? `e.expense_date = ${refExpr}`
        : "e.expense_date = CURRENT_DATE";
    case "semana":
      return referenceDate
        ? `e.expense_date >= date_trunc('week', ${refExpr})::date AND e.expense_date <= ${refExpr}`
        : "e.expense_date >= date_trunc('week', CURRENT_DATE)::date AND e.expense_date <= CURRENT_DATE";
    case "mes":
      return referenceDate
        ? `e.expense_date >= date_trunc('month', ${refExpr})::date AND e.expense_date <= ${refExpr}`
        : "e.expense_date >= date_trunc('month', CURRENT_DATE)::date AND e.expense_date <= CURRENT_DATE";
  }
}

export async function getTotalForPeriod(
  userId: number,
  period: ExpensePeriod,
  referenceDate?: string
): Promise<number> {
  const dateFilter = getPeriodDateFilter(period, referenceDate);
  const params: unknown[] = [userId];
  if (referenceDate) {
    params.push(referenceDate);
  }

  const result = await query<{ total: string | null }>(
    `SELECT COALESCE(SUM(e.amount), 0)::text AS total
     FROM expenses e
     WHERE e.user_id = $1 AND ${dateFilter}`,
    params
  );

  return parseFloat(result.rows[0]?.total ?? "0");
}

export interface CategorySummary {
  category_name: string;
  category_icon: string | null;
  total: string;
  count: string;
}

export async function getExpensesForPeriod(
  userId: number,
  period: ExpensePeriod
): Promise<ExpenseWithCategory[]> {
  const dateFilter = getPeriodDateFilter(period);

  const result = await query<ExpenseWithCategory>(
    `${EXPENSE_SELECT}
     FROM expenses e
     JOIN categories c ON c.id = e.category_id
     WHERE e.user_id = $1 AND ${dateFilter}
     ORDER BY e.expense_date DESC, e.created_at DESC`,
    [userId]
  );

  return result.rows;
}

export async function getExpensesSummaryByCategory(
  userId: number,
  period: ExpensePeriod
): Promise<CategorySummary[]> {
  const dateFilter = getPeriodDateFilter(period);

  const result = await query<CategorySummary>(
    `SELECT c.name AS category_name, c.icon AS category_icon,
            SUM(e.amount)::text AS total, COUNT(*)::text AS count
     FROM expenses e
     JOIN categories c ON c.id = e.category_id
     WHERE e.user_id = $1 AND ${dateFilter}
     GROUP BY c.id, c.name, c.icon
     ORDER BY SUM(e.amount) DESC`,
    [userId]
  );

  return result.rows;
}

export async function getLastExpense(userId: number): Promise<ExpenseWithCategory | null> {
  const result = await query<ExpenseWithCategory>(
    `SELECT e.id, e.user_id, e.amount, e.category_id, e.description,
            e.expense_date, e.source, c.name AS category_name, c.icon AS category_icon,
            (e.created_at AT TIME ZONE 'America/Sao_Paulo') AS created_at
     FROM expenses e
     JOIN categories c ON c.id = e.category_id
     WHERE e.user_id = $1
     ORDER BY e.created_at DESC, e.id DESC
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] ?? null;
}

export async function getExpenseById(
  expenseId: number,
  userId: number
): Promise<ExpenseWithCategory | null> {
  const result = await query<ExpenseWithCategory>(
    `${EXPENSE_SELECT}
     FROM expenses e
     JOIN categories c ON c.id = e.category_id
     WHERE e.id = $1 AND e.user_id = $2`,
    [expenseId, userId]
  );
  return result.rows[0] ?? null;
}

export async function deleteExpense(
  expenseId: number,
  userId: number
): Promise<boolean> {
  const result = await query(
    "DELETE FROM expenses WHERE id = $1 AND user_id = $2 RETURNING id",
    [expenseId, userId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function updateExpense(
  expenseId: number,
  userId: number,
  updates: {
    amount?: number;
    categoryId?: number;
    description?: string | null;
    expenseDate?: string;
    paymentMethod?: string;
    cardName?: string | null;
  }
): Promise<ExpenseWithCategory | null> {
  const sets: string[] = [];
  const params: unknown[] = [expenseId, userId];
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
  if (updates.expenseDate !== undefined) {
    sets.push(`expense_date = $${paramIndex++}`);
    params.push(updates.expenseDate);
  }
  if (updates.paymentMethod !== undefined) {
    sets.push(`payment_method = $${paramIndex++}`);
    params.push(updates.paymentMethod);
  }
  if (updates.cardName !== undefined) {
    sets.push(`card_name = $${paramIndex++}`);
    params.push(updates.cardName);
  }

  if (sets.length === 0) {
    return getExpenseById(expenseId, userId);
  }

  const result = await query<ExpenseWithCategory>(
    `UPDATE expenses e
     SET ${sets.join(", ")}
     FROM categories c
     WHERE e.id = $1 AND e.user_id = $2 AND c.id = e.category_id
     RETURNING e.id, e.user_id, e.amount, e.category_id, e.description,
               e.expense_date, e.source, e.payment_method, e.card_name,
               c.name AS category_name, c.icon AS category_icon,
               (e.created_at AT TIME ZONE 'America/Sao_Paulo') AS created_at`,
    params
  );

  return result.rows[0] ?? null;
}
