import { query } from "../db/pool.js";

export interface Expense {
  id: number;
  user_id: number;
  amount: string;
  category_id: number;
  description: string | null;
  expense_date: string;
  source: string;
}

export interface ExpenseWithCategory extends Expense {
  category_name: string;
  category_icon: string | null;
}

export async function createExpense(params: {
  userId: number;
  amount: number;
  categoryId: number;
  description: string | null;
  expenseDate: string;
  source?: string;
}): Promise<Expense> {
  const result = await query<Expense>(
    `INSERT INTO expenses (user_id, amount, category_id, description, expense_date, source)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, amount, category_id, description, expense_date, source`,
    [
      params.userId,
      params.amount,
      params.categoryId,
      params.description,
      params.expenseDate,
      params.source ?? "text",
    ]
  );

  return result.rows[0];
}

export async function getExpensesForPeriod(
  userId: number,
  period: "hoje" | "semana" | "mes"
): Promise<ExpenseWithCategory[]> {
  let dateFilter: string;

  switch (period) {
    case "hoje":
      dateFilter = "e.expense_date = CURRENT_DATE";
      break;
    case "semana":
      dateFilter =
        "e.expense_date >= date_trunc('week', CURRENT_DATE)::date AND e.expense_date <= CURRENT_DATE";
      break;
    case "mes":
      dateFilter =
        "e.expense_date >= date_trunc('month', CURRENT_DATE)::date AND e.expense_date <= CURRENT_DATE";
      break;
  }

  const result = await query<ExpenseWithCategory>(
    `SELECT e.id, e.user_id, e.amount, e.category_id, e.description,
            e.expense_date, e.source, c.name AS category_name, c.icon AS category_icon
     FROM expenses e
     JOIN categories c ON c.id = e.category_id
     WHERE e.user_id = $1 AND ${dateFilter}
     ORDER BY e.expense_date DESC, e.created_at DESC`,
    [userId]
  );

  return result.rows;
}

export async function getLastExpense(userId: number): Promise<ExpenseWithCategory | null> {
  const result = await query<ExpenseWithCategory>(
    `SELECT e.id, e.user_id, e.amount, e.category_id, e.description,
            e.expense_date, e.source, c.name AS category_name, c.icon AS category_icon
     FROM expenses e
     JOIN categories c ON c.id = e.category_id
     WHERE e.user_id = $1
     ORDER BY e.created_at DESC
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] ?? null;
}
