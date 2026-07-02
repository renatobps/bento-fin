const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export type Period = "hoje" | "semana" | "mes";

export interface ExpenseItem {
  id: number;
  amount: number;
  category: string;
  categoryIcon: string | null;
  description: string | null;
  expenseDate: string;
  createdAt: string;
  source: string;
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
  category: string;
  categoryIcon: string | null;
  description: string | null;
  incomeDate: string;
  createdAt: string;
  source: string;
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

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

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
): Promise<{ token: string; user: { id: number; phone: string; name: string | null } }> {
  return apiFetch("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });
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

export async function fetchCreditCards(token: string): Promise<CreditCardsResponse> {
  return apiFetch("/api/credit/cards", {}, token);
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
