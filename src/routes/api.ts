import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getExpensesForPeriod,
  getExpensesForMonth,
  getExpensesSummaryByCategory,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseById,
  type ExpensePeriod,
} from "../repositories/expenses.js";
import { getAllCategories, getCategoryById } from "../repositories/categories.js";
import { getAllIncomeCategories, getIncomeCategoryById } from "../repositories/income-categories.js";
import { parseAmount } from "../utils/format.js";
import { formatDateOnly, toISOString } from "../utils/timezone.js";
import {
  getSpendingLimits,
  upsertSpendingLimits,
} from "../repositories/spending-limits.js";
import { getTotalForPeriod } from "../repositories/expenses.js";
import { calculateBalance } from "../services/balance-calculator.js";
import {
  getIncomeForPeriod,
  getIncomeForMonth,
  createIncome,
  updateIncome,
  deleteIncome,
  getIncomeById,
  resolveMonthFromQuery,
} from "../repositories/income.js";
import { getCreditCards, updateCreditCardLimitById, createCreditCard, updateCreditCardById, findCreditCardByName } from "../repositories/credit-cards.js";
import { getCreditPaymentsForMonth } from "../repositories/credit-payments.js";
import { parseMonthQuery, getCurrentMonthRange } from "../repositories/month-query.js";
import { getUserById, updateUserProfile } from "../repositories/users.js";
import { formatPhoneDisplay } from "../utils/phone.js";
import { requirePlan } from "../middleware/plan.js";
import {
  getUserSubscription,
  getLimitUsageCounts,
  getUsageLimits,
  consumeUsageLimit,
} from "../repositories/subscription.js";
import { env } from "../config/env.js";
import { createCheckoutSession, createPortalSession } from "../routes/stripe.js";

function parseMonthPagination(query: Request["query"]): {
  page: number;
  pageSize: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(String(query.page ?? "1"), 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(String(query.pageSize ?? "50"), 10) || 50)
  );
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function mapExpenseItem(e: {
  id: number;
  amount: string;
  category_id?: number;
  category_name: string;
  category_icon: string | null;
  description: string | null;
  expense_date: string;
  created_at: string | Date;
  source: string;
  payment_method?: string;
  card_name?: string | null;
}) {
  return {
    id: e.id,
    amount: parseAmount(e.amount),
    categoryId: e.category_id,
    category: e.category_name,
    categoryIcon: e.category_icon,
    description: e.description,
    expenseDate: formatDateOnly(e.expense_date),
    createdAt: toISOString(e.created_at),
    source: e.source,
    paymentMethod: e.payment_method ?? "dinheiro",
    cardName: e.card_name ?? null,
  };
}

function formatPaymentAccount(
  paymentMethod?: string,
  cardName?: string | null
): string {
  if (paymentMethod === "credito") {
    return cardName ? `Crédito · ${cardName}` : "Crédito";
  }
  if (paymentMethod === "debito") return "Débito";
  if (paymentMethod === "pix") return "Pix";
  return "Dinheiro";
}

function parsePeriod(value: unknown): ExpensePeriod | null {
  if (value === "hoje" || value === "semana" || value === "mes") {
    return value;
  }
  return null;
}

function parseRequiredAmount(value: unknown): number | null {
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num * 100) / 100;
}

function parseDateOnly(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? value : null;
}

function parseCategoryId(value: unknown): number | null {
  const num = typeof value === "number" ? value : parseInt(String(value), 10);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}

function parsePaymentMethod(value: unknown): string | null {
  if (value === "dinheiro" || value === "pix" || value === "debito" || value === "credito") {
    return value;
  }
  return null;
}

function mapIncomeItem(i: {
  id: number;
  amount: string;
  category_id?: number;
  category_name: string;
  category_icon: string | null;
  description: string | null;
  income_date: string;
  created_at?: string | Date;
  source: string;
}) {
  return {
    id: i.id,
    amount: parseAmount(i.amount),
    categoryId: i.category_id,
    category: i.category_name,
    categoryIcon: i.category_icon,
    description: i.description,
    incomeDate: formatDateOnly(i.income_date),
    createdAt: i.created_at ? toISOString(i.created_at) : undefined,
    source: i.source,
  };
}

export const apiRouter = Router();

apiRouter.use(authMiddleware);

function parseProfileName(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 100);
}

function parseProfileEmail(value: unknown): string | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed) || trimmed.length > 255) return "invalid";
  return trimmed;
}

function mapProfileUser(user: {
  id: number;
  phone: string;
  name: string | null;
  email: string | null;
}) {
  return {
    id: user.id,
    phone: user.phone,
    phoneDisplay: formatPhoneDisplay(user.phone),
    name: user.name,
    email: user.email,
  };
}

apiRouter.get("/profile", async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.auth!.userId);
    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    res.json(mapProfileUser(user));
  } catch (err) {
    console.error("Erro ao buscar perfil:", err);
    res.status(500).json({ error: "Falha ao buscar perfil" });
  }
});

apiRouter.put("/profile", async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body ?? {};
    const updates: { name?: string | null; email?: string | null } = {};

    if (name !== undefined) {
      updates.name = parseProfileName(name);
    }

    if (email !== undefined) {
      const parsedEmail = parseProfileEmail(email);
      if (parsedEmail === "invalid") {
        res.status(400).json({ error: "E-mail inválido" });
        return;
      }
      updates.email = parsedEmail;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "Nenhum campo para atualizar" });
      return;
    }

    const updated = await updateUserProfile(req.auth!.userId, updates);
    if (!updated) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }

    res.json(mapProfileUser(updated));
  } catch (err) {
    console.error("Erro ao atualizar perfil:", err);
    res.status(500).json({ error: "Falha ao atualizar perfil" });
  }
});

apiRouter.get("/expenses", async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const month = parseMonthQuery(req.query.year, req.query.month);

    if (month) {
      const { page, pageSize, offset } = parseMonthPagination(req.query);
      const expenses = await getExpensesForMonth(
        userId,
        month.startDate,
        month.endDate,
        { limit: pageSize, offset }
      );
      const total = expenses.reduce((sum, e) => sum + parseAmount(e.amount), 0);
      res.json({
        year: month.year,
        month: month.month,
        total,
        page,
        pageSize,
        hasMore: expenses.length === pageSize,
        expenses: expenses.map(mapExpenseItem),
      });
      return;
    }

    const period = parsePeriod(req.query.period) ?? "mes";
    const expenses = await getExpensesForPeriod(userId, period);
    const total = expenses.reduce((sum, e) => sum + parseAmount(e.amount), 0);

    res.json({
      period,
      total,
      expenses: expenses.map(mapExpenseItem),
    });
  } catch (err) {
    console.error("Erro ao buscar gastos:", err);
    res.status(500).json({ error: "Falha ao buscar gastos" });
  }
});

apiRouter.post("/expenses", async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const { amount, categoryId, description, expenseDate, paymentMethod, cardName } =
      req.body ?? {};

    const parsedAmount = parseRequiredAmount(amount);
    const parsedCategoryId = parseCategoryId(categoryId);
    const parsedDate = parseDateOnly(expenseDate);
    const parsedPayment = parsePaymentMethod(paymentMethod) ?? "dinheiro";

    if (parsedAmount === null) {
      res.status(400).json({ error: "Valor inválido" });
      return;
    }
    if (parsedCategoryId === null) {
      res.status(400).json({ error: "Categoria inválida" });
      return;
    }
    if (parsedDate === null) {
      res.status(400).json({ error: "Data inválida" });
      return;
    }

    const category = await getCategoryById(parsedCategoryId);
    if (!category) {
      res.status(400).json({ error: "Categoria não encontrada" });
      return;
    }

    const trimmedCard =
      typeof cardName === "string" && cardName.trim() ? cardName.trim() : null;

    if (parsedPayment === "credito" && !trimmedCard) {
      res.status(400).json({ error: "Informe o cartão de crédito" });
      return;
    }

    const usageCheck = await consumeUsageLimit(userId, "expense");
    if (!usageCheck.ok) {
      res.status(403).json({
        error: `Limite de ${usageCheck.limit} gastos no plano gratuito atingido este mês`,
        upgradeUrl: `${env.frontendUrl}/planos`,
      });
      return;
    }

    const expense = await createExpense({
      userId,
      amount: parsedAmount,
      categoryId: parsedCategoryId,
      description: typeof description === "string" ? description.trim() || null : null,
      expenseDate: parsedDate,
      source: "dashboard",
      paymentMethod: parsedPayment,
      cardName: parsedPayment === "credito" ? trimmedCard : null,
    });

    const full = await getExpenseById(expense.id, userId);
    res.status(201).json(mapExpenseItem(full!));
  } catch (err) {
    console.error("Erro ao criar despesa:", err);
    res.status(500).json({ error: "Falha ao criar despesa" });
  }
});

apiRouter.put("/expenses/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const expenseId = parseInt(String(req.params.id), 10);
    const { amount, categoryId, description, expenseDate, paymentMethod, cardName } =
      req.body ?? {};

    if (!Number.isFinite(expenseId) || expenseId <= 0) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const updates: Parameters<typeof updateExpense>[2] = {};

    if (amount !== undefined) {
      const parsedAmount = parseRequiredAmount(amount);
      if (parsedAmount === null) {
        res.status(400).json({ error: "Valor inválido" });
        return;
      }
      updates.amount = parsedAmount;
    }

    if (categoryId !== undefined) {
      const parsedCategoryId = parseCategoryId(categoryId);
      if (parsedCategoryId === null) {
        res.status(400).json({ error: "Categoria inválida" });
        return;
      }
      const category = await getCategoryById(parsedCategoryId);
      if (!category) {
        res.status(400).json({ error: "Categoria não encontrada" });
        return;
      }
      updates.categoryId = parsedCategoryId;
    }

    if (description !== undefined) {
      updates.description =
        typeof description === "string" ? description.trim() || null : null;
    }

    if (expenseDate !== undefined) {
      const parsedDate = parseDateOnly(expenseDate);
      if (parsedDate === null) {
        res.status(400).json({ error: "Data inválida" });
        return;
      }
      updates.expenseDate = parsedDate;
    }

    if (paymentMethod !== undefined) {
      const parsedPayment = parsePaymentMethod(paymentMethod);
      if (parsedPayment === null) {
        res.status(400).json({ error: "Forma de pagamento inválida" });
        return;
      }
      updates.paymentMethod = parsedPayment;
      if (parsedPayment !== "credito") {
        updates.cardName = null;
      }
    }

    if (cardName !== undefined) {
      updates.cardName =
        typeof cardName === "string" && cardName.trim() ? cardName.trim() : null;
    }

    const updated = await updateExpense(expenseId, userId, updates);
    if (!updated) {
      res.status(404).json({ error: "Despesa não encontrada" });
      return;
    }

    res.json(mapExpenseItem(updated));
  } catch (err) {
    console.error("Erro ao atualizar despesa:", err);
    res.status(500).json({ error: "Falha ao atualizar despesa" });
  }
});

apiRouter.delete("/expenses/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const expenseId = parseInt(String(req.params.id), 10);

    if (!Number.isFinite(expenseId) || expenseId <= 0) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const deleted = await deleteExpense(expenseId, userId);
    if (!deleted) {
      res.status(404).json({ error: "Despesa não encontrada" });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao excluir despesa:", err);
    res.status(500).json({ error: "Falha ao excluir despesa" });
  }
});

apiRouter.get("/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getAllCategories();
    res.json({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
      })),
    });
  } catch (err) {
    console.error("Erro ao buscar categorias:", err);
    res.status(500).json({ error: "Falha ao buscar categorias" });
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

function parseBillingDueDay(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : parseInt(String(value), 10);
  if (!Number.isFinite(num) || num < 1 || num > 31) return null;
  return num;
}

function mapCreditCardResponse(c: {
  id: number;
  name: string;
  credit_limit: string | null;
  billing_due_day: number | null;
}) {
  return {
    id: c.id,
    name: c.name,
    creditLimit: c.credit_limit ? parseAmount(c.credit_limit) : null,
    billingDueDay: c.billing_due_day,
  };
}

apiRouter.get("/limits", requirePlan("essencial"), async (req: Request, res: Response) => {
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

apiRouter.put("/limits", requirePlan("essencial"), async (req: Request, res: Response) => {
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
    const userId = req.auth!.userId;
    const month = parseMonthQuery(req.query.year, req.query.month);

    if (month) {
      const { page, pageSize, offset } = parseMonthPagination(req.query);
      const income = await getIncomeForMonth(
        userId,
        month.startDate,
        month.endDate,
        { limit: pageSize, offset }
      );
      const total = income.reduce((sum, i) => sum + parseAmount(i.amount), 0);
      res.json({
        year: month.year,
        month: month.month,
        total,
        page,
        pageSize,
        hasMore: income.length === pageSize,
        income: income.map((i) => mapIncomeItem(i)),
      });
      return;
    }

    const period = parsePeriod(req.query.period) ?? "mes";
    const income = await getIncomeForPeriod(userId, period);
    const total = income.reduce((sum, i) => sum + parseAmount(i.amount), 0);

    res.json({
      period,
      total,
      income: income.map((i) => mapIncomeItem(i)),
    });
  } catch (err) {
    console.error("Erro ao buscar receitas:", err);
    res.status(500).json({ error: "Falha ao buscar receitas" });
  }
});

apiRouter.get("/income/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getAllIncomeCategories();
    res.json({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
      })),
    });
  } catch (err) {
    console.error("Erro ao buscar categorias de receita:", err);
    res.status(500).json({ error: "Falha ao buscar categorias de receita" });
  }
});

apiRouter.post("/income", async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const { amount, categoryId, description, incomeDate } = req.body ?? {};

    const parsedAmount = parseRequiredAmount(amount);
    const parsedCategoryId = parseCategoryId(categoryId);
    const parsedDate = parseDateOnly(incomeDate);

    if (parsedAmount === null) {
      res.status(400).json({ error: "Valor inválido" });
      return;
    }
    if (parsedCategoryId === null) {
      res.status(400).json({ error: "Categoria inválida" });
      return;
    }
    if (parsedDate === null) {
      res.status(400).json({ error: "Data inválida" });
      return;
    }

    const category = await getIncomeCategoryById(parsedCategoryId);
    if (!category) {
      res.status(400).json({ error: "Categoria não encontrada" });
      return;
    }

    const usageCheck = await consumeUsageLimit(userId, "income");
    if (!usageCheck.ok) {
      res.status(403).json({
        error: `Limite de ${usageCheck.limit} receitas no plano gratuito atingido este mês`,
        upgradeUrl: `${env.frontendUrl}/planos`,
      });
      return;
    }

    const created = await createIncome({
      userId,
      amount: parsedAmount,
      categoryId: parsedCategoryId,
      description: typeof description === "string" ? description.trim() || null : null,
      incomeDate: parsedDate,
      source: "dashboard",
    });

    const full = await getIncomeById(created.id, userId);
    res.status(201).json(mapIncomeItem(full!));
  } catch (err) {
    console.error("Erro ao criar receita:", err);
    res.status(500).json({ error: "Falha ao criar receita" });
  }
});

apiRouter.put("/income/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const incomeId = parseInt(String(req.params.id), 10);
    const { amount, categoryId, description, incomeDate } = req.body ?? {};

    if (!Number.isFinite(incomeId) || incomeId <= 0) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const updates: Parameters<typeof updateIncome>[2] = {};

    if (amount !== undefined) {
      const parsedAmount = parseRequiredAmount(amount);
      if (parsedAmount === null) {
        res.status(400).json({ error: "Valor inválido" });
        return;
      }
      updates.amount = parsedAmount;
    }

    if (categoryId !== undefined) {
      const parsedCategoryId = parseCategoryId(categoryId);
      if (parsedCategoryId === null) {
        res.status(400).json({ error: "Categoria inválida" });
        return;
      }
      const category = await getIncomeCategoryById(parsedCategoryId);
      if (!category) {
        res.status(400).json({ error: "Categoria não encontrada" });
        return;
      }
      updates.categoryId = parsedCategoryId;
    }

    if (description !== undefined) {
      updates.description =
        typeof description === "string" ? description.trim() || null : null;
    }

    if (incomeDate !== undefined) {
      const parsedDate = parseDateOnly(incomeDate);
      if (parsedDate === null) {
        res.status(400).json({ error: "Data inválida" });
        return;
      }
      updates.incomeDate = parsedDate;
    }

    const updated = await updateIncome(incomeId, userId, updates);
    if (!updated) {
      res.status(404).json({ error: "Receita não encontrada" });
      return;
    }

    res.json(mapIncomeItem(updated));
  } catch (err) {
    console.error("Erro ao atualizar receita:", err);
    res.status(500).json({ error: "Falha ao atualizar receita" });
  }
});

apiRouter.delete("/income/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const incomeId = parseInt(String(req.params.id), 10);

    if (!Number.isFinite(incomeId) || incomeId <= 0) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const deleted = await deleteIncome(incomeId, userId);
    if (!deleted) {
      res.status(404).json({ error: "Receita não encontrada" });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao excluir receita:", err);
    res.status(500).json({ error: "Falha ao excluir receita" });
  }
});

apiRouter.get("/credit/transactions", async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const month = resolveMonthFromQuery(req.query.year, req.query.month);
    const expenses = await getExpensesForMonth(
      userId,
      month.startDate,
      month.endDate,
      { paymentMethod: "credito" }
    );
    const total = expenses.reduce((sum, e) => sum + parseAmount(e.amount), 0);

    res.json({
      year: month.year,
      month: month.month,
      total,
      transactions: expenses.map((e) => ({
        ...mapExpenseItem(e),
        account: formatPaymentAccount(e.payment_method, e.card_name),
      })),
    });
  } catch (err) {
    console.error("Erro ao buscar transações de crédito:", err);
    res.status(500).json({ error: "Falha ao buscar transações de crédito" });
  }
});

apiRouter.get("/ledger", async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const month = resolveMonthFromQuery(req.query.year, req.query.month);
    const balance = await calculateBalance(userId);

    const [income, expenses, payments] = await Promise.all([
      getIncomeForMonth(userId, month.startDate, month.endDate),
      getExpensesForMonth(userId, month.startDate, month.endDate),
      getCreditPaymentsForMonth(userId, month.startDate, month.endDate),
    ]);

    type LedgerEntry = {
      id: string;
      type: "income" | "expense" | "payment";
      numericId: number;
      categoryId?: number;
      paymentMethod?: string;
      cardName?: string | null;
      date: string;
      description: string;
      category: string;
      categoryIcon: string | null;
      account: string;
      amount: number;
    };

    const entries: LedgerEntry[] = [
      ...income.map((i) => ({
        id: `income-${i.id}`,
        type: "income" as const,
        numericId: i.id,
        categoryId: i.category_id,
        date: formatDateOnly(i.income_date),
        description: i.description ?? i.category_name,
        category: i.category_name,
        categoryIcon: i.category_icon,
        account: "Receita",
        amount: parseAmount(i.amount),
      })),
      ...expenses.map((e) => ({
        id: `expense-${e.id}`,
        type: "expense" as const,
        numericId: e.id,
        categoryId: e.category_id,
        paymentMethod: e.payment_method ?? "dinheiro",
        cardName: e.card_name ?? null,
        date: formatDateOnly(e.expense_date),
        description: e.description ?? e.category_name,
        category: e.category_name,
        categoryIcon: e.category_icon,
        account: formatPaymentAccount(e.payment_method, e.card_name),
        amount: -parseAmount(e.amount),
      })),
      ...payments.map((p) => ({
        id: `payment-${p.id}`,
        type: "payment" as const,
        numericId: p.id,
        date: formatDateOnly(p.payment_date),
        description: p.card_name
          ? `Pagamento fatura ${p.card_name}`
          : "Pagamento de fatura",
        category: "Fatura",
        categoryIcon: "💳",
        account: p.card_name ?? "Crédito",
        amount: -parseAmount(p.amount),
      })),
    ].sort((a, b) => b.date.localeCompare(a.date));

    res.json({
      year: month.year,
      month: month.month,
      availableBalance: balance.availableBalance,
      entries,
    });
  } catch (err) {
    console.error("Erro ao buscar extrato:", err);
    res.status(500).json({ error: "Falha ao buscar extrato" });
  }
});

apiRouter.get("/credit/cards", requirePlan("essencial"), async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const cards = await getCreditCards(userId);

    res.json({
      cards: cards.map(mapCreditCardResponse),
    });
  } catch (err) {
    console.error("Erro ao buscar cartões:", err);
    res.status(500).json({ error: "Falha ao buscar cartões" });
  }
});

apiRouter.post("/credit/cards", requirePlan("essencial"), async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const { name, creditLimit, billingDueDay } = req.body ?? {};

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName || trimmedName.length > 50) {
      res.status(400).json({ error: "Nome do cartão inválido" });
      return;
    }

    const existing = await findCreditCardByName(userId, trimmedName);
    if (existing) {
      res.status(409).json({ error: "Já existe um cartão com esse nome" });
      return;
    }

    const userSub = await getUserSubscription(userId);
    if (userSub?.subscription_plan === "essencial") {
      const currentCards = await getCreditCards(userId);
      if (currentCards.length >= 2) {
        res.status(403).json({
          error: "Plano Essencial permite até 2 cartões. Faça upgrade para Pro.",
          upgradeUrl: `${process.env.FRONTEND_URL ?? "http://localhost:3001"}/planos`,
        });
        return;
      }
    }

    const limit = parseOptionalLimit(creditLimit);
    const dueDay = parseBillingDueDay(billingDueDay);

    if (creditLimit !== undefined && creditLimit !== null && creditLimit !== "" && limit === null) {
      res.status(400).json({ error: "Limite inválido" });
      return;
    }

    if (
      billingDueDay !== undefined &&
      billingDueDay !== null &&
      billingDueDay !== "" &&
      dueDay === null
    ) {
      res.status(400).json({ error: "Dia de vencimento inválido (use 1 a 31)" });
      return;
    }

    const card = await createCreditCard(userId, trimmedName, limit, dueDay);
    res.status(201).json(mapCreditCardResponse(card));
  } catch (err) {
    console.error("Erro ao criar cartão:", err);
    res.status(500).json({ error: "Falha ao criar cartão" });
  }
});

apiRouter.put("/credit/cards/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const cardId = parseInt(String(req.params.id), 10);
    const { creditLimit, billingDueDay } = req.body ?? {};

    if (!Number.isFinite(cardId) || cardId <= 0) {
      res.status(400).json({ error: "ID do cartão inválido" });
      return;
    }

    const updates: { creditLimit?: number | null; billingDueDay?: number | null } = {};

    if (creditLimit !== undefined) {
      const limit = parseOptionalLimit(creditLimit);
      if (creditLimit !== null && creditLimit !== "" && limit === null) {
        res.status(400).json({ error: "Limite inválido" });
        return;
      }
      updates.creditLimit = limit;
    }

    if (billingDueDay !== undefined) {
      const dueDay = parseBillingDueDay(billingDueDay);
      if (billingDueDay !== null && billingDueDay !== "" && dueDay === null) {
        res.status(400).json({ error: "Dia de vencimento inválido (use 1 a 31)" });
        return;
      }
      updates.billingDueDay = dueDay;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "Nenhum campo para atualizar" });
      return;
    }

    const updated = await updateCreditCardById(userId, cardId, updates);
    if (!updated) {
      res.status(404).json({ error: "Cartão não encontrado" });
      return;
    }

    res.json(mapCreditCardResponse(updated));
  } catch (err) {
    console.error("Erro ao atualizar cartão:", err);
    res.status(500).json({ error: "Falha ao atualizar cartão" });
  }
});

apiRouter.get("/subscription", async (req: Request, res: Response) => {
  try {
    const user = await getUserSubscription(req.auth!.userId);
    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }

    const usage = await getLimitUsageCounts(user.id);
    const limits = getUsageLimits(user.subscription_plan);

    res.json({
      plan: user.subscription_plan,
      status: user.subscription_status,
      expiresAt: user.subscription_expires_at
        ? toISOString(user.subscription_expires_at)
        : null,
      usage: {
        expensesThisMonth: usage.expenses,
        incomeThisMonth: usage.income,
        limits: {
          expenses: limits.expenses,
          income: limits.income,
        },
      },
    });
  } catch (err) {
    console.error("Erro ao buscar assinatura:", err);
    res.status(500).json({ error: "Falha ao buscar assinatura" });
  }
});

apiRouter.post("/stripe/create-checkout", async (req: Request, res: Response) => {
  try {
    const { plan, interval } = req.body ?? {};
    if (plan !== "essencial" && plan !== "pro") {
      res.status(400).json({ error: "Plano inválido" });
      return;
    }
    if (interval !== "monthly" && interval !== "yearly") {
      res.status(400).json({ error: "Intervalo inválido" });
      return;
    }

    const checkoutUrl = await createCheckoutSession(req.auth!.userId, plan, interval);
    res.json({ checkoutUrl });
  } catch (err) {
    console.error("Erro ao criar checkout:", err);
    const message = err instanceof Error ? err.message : "Falha ao criar checkout";
    res.status(500).json({ error: message });
  }
});

apiRouter.post("/stripe/portal", async (req: Request, res: Response) => {
  try {
    const portalUrl = await createPortalSession(req.auth!.userId);
    res.json({ portalUrl });
  } catch (err) {
    console.error("Erro ao abrir portal:", err);
    const message = err instanceof Error ? err.message : "Falha ao abrir portal";
    res.status(500).json({ error: message });
  }
});

apiRouter.post("/expenses/export", requirePlan("pro"), async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const month = parseMonthQuery(req.query.year, req.query.month) ?? getCurrentMonthRange();
    const expenses = await getExpensesForMonth(userId, month.startDate, month.endDate);

    const header = "data,valor,categoria,descricao,forma_pagamento\n";
    const rows = expenses
      .map((e) => {
        const desc = (e.description ?? "").replace(/"/g, '""');
        return `${e.expense_date},${e.amount},"${e.category_name}","${desc}",${e.payment_method ?? "dinheiro"}`;
      })
      .join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="gastos-${month.year}-${month.month}.csv"`);
    res.send("\uFEFF" + header + rows);
  } catch (err) {
    console.error("Erro ao exportar gastos:", err);
    res.status(500).json({ error: "Falha ao exportar gastos" });
  }
});

apiRouter.post("/income/export", requirePlan("pro"), async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const month = parseMonthQuery(req.query.year, req.query.month) ?? getCurrentMonthRange();
    const income = await getIncomeForMonth(userId, month.startDate, month.endDate);

    const header = "data,valor,categoria,descricao\n";
    const rows = income
      .map((i) => {
        const desc = (i.description ?? "").replace(/"/g, '""');
        return `${i.income_date},${i.amount},"${i.category_name}","${desc}"`;
      })
      .join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="receitas-${month.year}-${month.month}.csv"`);
    res.send("\uFEFF" + header + rows);
  } catch (err) {
    console.error("Erro ao exportar receitas:", err);
    res.status(500).json({ error: "Falha ao exportar receitas" });
  }
});
