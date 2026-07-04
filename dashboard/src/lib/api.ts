function getApiUrl(): string {
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${protocol}//${hostname}:3000`;
    }
  }

  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
}

export type Period = "hoje" | "semana" | "mes";

export interface ExpenseItem {
  id: number;
  amount: number;
  categoryId?: number;
  category: string;
  categoryIcon: string | null;
  description: string | null;
  expenseDate: string;
  createdAt: string;
  source: string;
  paymentMethod?: string;
  cardName?: string | null;
}

export interface MonthListResponse<T> {
  year: number;
  month: number;
  total: number;
}

export interface ExpensesMonthResponse extends MonthListResponse<ExpenseItem> {
  expenses: ExpenseItem[];
}

export interface IncomeMonthResponse extends MonthListResponse<IncomeItem> {
  income: IncomeItem[];
}

export interface CreditTransactionItem extends ExpenseItem {
  account: string;
}

export interface CreditTransactionsResponse extends MonthListResponse<CreditTransactionItem> {
  transactions: CreditTransactionItem[];
}

export interface LedgerEntry {
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
}

export interface LedgerResponse {
  year: number;
  month: number;
  availableBalance: number;
  entries: LedgerEntry[];
}

export interface ExpensesResponse {
  period: Period;
  total: number;
  expenses: ExpenseItem[];
}

export interface CategorySummary {
  name: string;
  icon: string | null;
  total: number;
  count: number;
}

export interface SummaryResponse {
  period: Period;
  total: number;
  categories: CategorySummary[];
}

export interface LimitUsage {
  total: number;
  limit: number | null;
}

export interface LimitsResponse {
  dailyLimit: number | null;
  weeklyLimit: number | null;
  monthlyLimit: number | null;
  usage: {
    hoje: LimitUsage;
    semana: LimitUsage;
    mes: LimitUsage;
  };
}

export interface LimitsInput {
  dailyLimit: number | null;
  weeklyLimit: number | null;
  monthlyLimit: number | null;
}

export interface BalanceSummary {
  initialBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalCreditPayments: number;
  availableBalance: number;
  totalCreditDebt: number;
  creditByCard: Array<{ cardName: string; total: number }>;
}

export interface IncomeItem {
  id: number;
  amount: number;
  categoryId?: number;
  category: string;
  categoryIcon: string | null;
  description: string | null;
  incomeDate: string;
  createdAt: string;
  source: string;
}

export interface CategoryItem {
  id: number;
  name: string;
  icon: string | null;
}

export interface ExpenseInput {
  amount: number;
  categoryId: number;
  description?: string | null;
  expenseDate: string;
  paymentMethod?: string;
  cardName?: string | null;
}

export interface IncomeInput {
  amount: number;
  categoryId: number;
  description?: string | null;
  incomeDate: string;
}

export interface IncomeResponse {
  period: Period;
  total: number;
  income: IncomeItem[];
}

export interface CreditCardItem {
  id: number;
  name: string;
  creditLimit: number | null;
  billingDueDay: number | null;
}

export interface CreditCardInput {
  name: string;
  creditLimit?: number | null;
  billingDueDay?: number | null;
}

export interface CreditCardsResponse {
  cards: CreditCardItem[];
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${getApiUrl()}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Erro ${res.status}`);
  }

  return res.json();
}

export async function requestOtp(phone: string): Promise<void> {
  await apiFetch("/api/auth/request-otp", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(
  phone: string,
  code: string
): Promise<{ token: string; user: { id: number; phone: string; name: string | null; email: string | null } }> {
  return apiFetch("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });
}

export async function fetchProfile(token: string): Promise<UserProfile> {
  return apiFetch("/api/profile", {}, token);
}

export async function updateProfile(
  token: string,
  input: { name?: string | null; email?: string | null }
): Promise<UserProfile> {
  return apiFetch("/api/profile", {
    method: "PUT",
    body: JSON.stringify(input),
  }, token);
}

export interface UserProfile {
  id: number;
  phone: string;
  phoneDisplay: string;
  name: string | null;
  email: string | null;
}

export async function fetchExpensesByMonth(
  token: string,
  year: number,
  month: number
): Promise<ExpensesMonthResponse> {
  return apiFetch(`/api/expenses?year=${year}&month=${month}`, {}, token);
}

export async function fetchIncomeByMonth(
  token: string,
  year: number,
  month: number
): Promise<IncomeMonthResponse> {
  return apiFetch(`/api/income?year=${year}&month=${month}`, {}, token);
}

export async function fetchCreditTransactionsByMonth(
  token: string,
  year: number,
  month: number
): Promise<CreditTransactionsResponse> {
  return apiFetch(`/api/credit/transactions?year=${year}&month=${month}`, {}, token);
}

export async function fetchLedger(
  token: string,
  year: number,
  month: number
): Promise<LedgerResponse> {
  return apiFetch(`/api/ledger?year=${year}&month=${month}`, {}, token);
}

export async function fetchExpenses(
  token: string,
  period: Period
): Promise<ExpensesResponse> {
  return apiFetch(`/api/expenses?period=${period}`, {}, token);
}

export async function fetchSummary(
  token: string,
  period: Period
): Promise<SummaryResponse> {
  return apiFetch(`/api/expenses/summary?period=${period}`, {}, token);
}

export async function fetchLimits(token: string): Promise<LimitsResponse> {
  return apiFetch("/api/limits", {}, token);
}

export async function updateLimits(
  token: string,
  limits: LimitsInput
): Promise<LimitsInput> {
  return apiFetch("/api/limits", {
    method: "PUT",
    body: JSON.stringify(limits),
  }, token);
}

export async function fetchBalance(token: string): Promise<BalanceSummary> {
  return apiFetch("/api/balance", {}, token);
}

export async function fetchIncome(
  token: string,
  period: Period
): Promise<IncomeResponse> {
  return apiFetch(`/api/income?period=${period}`, {}, token);
}

export async function fetchExpenseCategories(token: string): Promise<CategoryItem[]> {
  const data = await apiFetch<{ categories: CategoryItem[] }>("/api/categories", {}, token);
  return data.categories;
}

export async function fetchIncomeCategories(token: string): Promise<CategoryItem[]> {
  const data = await apiFetch<{ categories: CategoryItem[] }>("/api/income/categories", {}, token);
  return data.categories;
}

export async function createExpenseEntry(
  token: string,
  input: ExpenseInput
): Promise<ExpenseItem> {
  return apiFetch("/api/expenses", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function updateExpenseEntry(
  token: string,
  id: number,
  input: Partial<ExpenseInput>
): Promise<ExpenseItem> {
  return apiFetch(`/api/expenses/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  }, token);
}

export async function deleteExpenseEntry(token: string, id: number): Promise<void> {
  await apiFetch(`/api/expenses/${id}`, { method: "DELETE" }, token);
}

export async function createIncomeEntry(
  token: string,
  input: IncomeInput
): Promise<IncomeItem> {
  return apiFetch("/api/income", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function updateIncomeEntry(
  token: string,
  id: number,
  input: Partial<IncomeInput>
): Promise<IncomeItem> {
  return apiFetch(`/api/income/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  }, token);
}

export async function deleteIncomeEntry(token: string, id: number): Promise<void> {
  await apiFetch(`/api/income/${id}`, { method: "DELETE" }, token);
}

export async function fetchCreditCards(token: string): Promise<CreditCardsResponse> {
  return apiFetch("/api/credit/cards", {}, token);
}

export async function createCreditCard(
  token: string,
  input: CreditCardInput
): Promise<CreditCardItem> {
  return apiFetch("/api/credit/cards", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function updateCreditCard(
  token: string,
  cardId: number,
  input: { creditLimit?: number | null; billingDueDay?: number | null }
): Promise<CreditCardItem> {
  return apiFetch(`/api/credit/cards/${cardId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  }, token);
}

export async function updateCreditCardLimit(
  token: string,
  cardId: number,
  creditLimit: number
): Promise<CreditCardItem> {
  return updateCreditCard(token, cardId, { creditLimit });
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const PERIOD_LABELS: Record<Period, string> = {
  hoje: "Hoje",
  semana: "Esta semana",
  mes: "Este mês",
};

const TZ = "America/Sao_Paulo";

export function formatExpenseDate(value: string): string {
  const match = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value.slice(0, 10);
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

export function formatExpenseDateTime(_expenseDate: string, createdAt?: string): string {
  if (!createdAt) return formatExpenseDate(_expenseDate);

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));
}
