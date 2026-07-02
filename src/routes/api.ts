import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getExpensesForPeriod,
  getExpensesSummaryByCategory,
  type ExpensePeriod,
} from "../repositories/expenses.js";
import { parseAmount } from "../utils/format.js";
import { formatDateOnly, toISOString } from "../utils/timezone.js";
import {
  getSpendingLimits,
  upsertSpendingLimits,
} from "../repositories/spending-limits.js";
import { getTotalForPeriod } from "../repositories/expenses.js";
import { calculateBalance } from "../services/balance-calculator.js";
import { getIncomeForPeriod } from "../repositories/income.js";
import { getCreditCards } from "../repositories/credit-cards.js";

function parsePeriod(value: unknown): ExpensePeriod | null {
  if (value === "hoje" || value === "semana" || value === "mes") {
    return value;
  }
  return null;
}

export const apiRouter = Router();

apiRouter.use(authMiddleware);

apiRouter.get("/expenses", async (req: Request, res: Response) => {
  try {
    const period = parsePeriod(req.query.period) ?? "mes";
    const userId = req.auth!.userId;

    const expenses = await getExpensesForPeriod(userId, period);
    const total = expenses.reduce((sum, e) => sum + parseAmount(e.amount), 0);

    res.json({
      period,
      total,
      expenses: expenses.map((e) => ({
        id: e.id,
        amount: parseAmount(e.amount),
        category: e.category_name,
        categoryIcon: e.category_icon,
        description: e.description,
        expenseDate: formatDateOnly(e.expense_date),
        createdAt: toISOString(e.created_at),
        source: e.source,
      })),
    });
  } catch (err) {
    console.error("Erro ao buscar gastos:", err);
    res.status(500).json({ error: "Falha ao buscar gastos" });
  }
});

apiRouter.get("/expenses/summary", async (req: Request, res: Response) => {
  try {
    const period = parsePeriod(req.query.period) ?? "mes";
    const userId = req.auth!.userId;

    const categories = await getExpensesSummaryByCategory(userId, period);
    const total = categories.reduce(
      (sum, c) => sum + parseAmount(c.total),
      0
    );

    res.json({
      period,
      total,
      categories: categories.map((c) => ({
        name: c.category_name,
        icon: c.category_icon,
        total: parseAmount(c.total),
        count: parseInt(c.count, 10),
      })),
    });
  } catch (err) {
    console.error("Erro ao buscar resumo:", err);
    res.status(500).json({ error: "Falha ao buscar resumo" });
  }
});

function parseOptionalLimit(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num * 100) / 100;
}

apiRouter.get("/limits", async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const limits = await getSpendingLimits(userId);

    const dailyLimit = limits?.daily_limit ? parseAmount(limits.daily_limit) : null;
    const weeklyLimit = limits?.weekly_limit ? parseAmount(limits.weekly_limit) : null;
    const monthlyLimit = limits?.monthly_limit ? parseAmount(limits.monthly_limit) : null;

    const [dailyTotal, weeklyTotal, monthlyTotal] = await Promise.all([
      getTotalForPeriod(userId, "hoje"),
      getTotalForPeriod(userId, "semana"),
      getTotalForPeriod(userId, "mes"),
    ]);

    res.json({
      dailyLimit,
      weeklyLimit,
      monthlyLimit,
      usage: {
        hoje: { total: dailyTotal, limit: dailyLimit },
        semana: { total: weeklyTotal, limit: weeklyLimit },
        mes: { total: monthlyTotal, limit: monthlyLimit },
      },
    });
  } catch (err) {
    console.error("Erro ao buscar limites:", err);
    res.status(500).json({ error: "Falha ao buscar limites" });
  }
});

apiRouter.put("/limits", async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const { dailyLimit, weeklyLimit, monthlyLimit } = req.body ?? {};

    const parsed = {
      dailyLimit: parseOptionalLimit(dailyLimit),
      weeklyLimit: parseOptionalLimit(weeklyLimit),
      monthlyLimit: parseOptionalLimit(monthlyLimit),
    };

    const saved = await upsertSpendingLimits(userId, parsed);

    res.json({
      dailyLimit: saved.daily_limit ? parseAmount(saved.daily_limit) : null,
      weeklyLimit: saved.weekly_limit ? parseAmount(saved.weekly_limit) : null,
      monthlyLimit: saved.monthly_limit ? parseAmount(saved.monthly_limit) : null,
    });
  } catch (err) {
    console.error("Erro ao salvar limites:", err);
    res.status(500).json({ error: "Falha ao salvar limites" });
  }
});

apiRouter.get("/balance", async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const balance = await calculateBalance(userId);
    res.json(balance);
  } catch (err) {
    console.error("Erro ao buscar saldo:", err);
    res.status(500).json({ error: "Falha ao buscar saldo" });
  }
});

apiRouter.get("/income", async (req: Request, res: Response) => {
  try {
    const period = parsePeriod(req.query.period) ?? "mes";
    const userId = req.auth!.userId;

    const income = await getIncomeForPeriod(userId, period);
    const total = income.reduce((sum, i) => sum + parseAmount(i.amount), 0);

    res.json({
      period,
      total,
      income: income.map((i) => ({
        id: i.id,
        amount: parseAmount(i.amount),
        category: i.category_name,
        categoryIcon: i.category_icon,
        description: i.description,
        incomeDate: formatDateOnly(i.income_date),
        createdAt: toISOString(i.created_at!),
        source: i.source,
      })),
    });
  } catch (err) {
    console.error("Erro ao buscar receitas:", err);
    res.status(500).json({ error: "Falha ao buscar receitas" });
  }
});

apiRouter.get("/credit/cards", async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const cards = await getCreditCards(userId);

    res.json({
      cards: cards.map((c) => ({
        id: c.id,
        name: c.name,
        creditLimit: c.credit_limit ? parseAmount(c.credit_limit) : null,
      })),
    });
  } catch (err) {
    console.error("Erro ao buscar cartões:", err);
    res.status(500).json({ error: "Falha ao buscar cartões" });
  }
});
