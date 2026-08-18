import { resolveApiUrl } from "@/lib/api-url";

const ADMIN_TOKEN_KEY = "bento_admin_token";
/** Só sinaliza "existe sessão" para o middleware de rota — nunca o token. */
const ADMIN_FLAG_COOKIE = "admin_session";

function getApiUrl(): string {
  return resolveApiUrl();
}

export class AdminApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function adminFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const authToken = token ?? getAdminToken();
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${getApiUrl()}${path}`, { ...options, headers });
  if (!res.ok) {
    let message = "Erro na requisição";
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new AdminApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function saveAdminSession(token: string, hours = 8) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${ADMIN_FLAG_COOKIE}=1; path=/; max-age=${hours * 3600}; SameSite=Lax${secure}`;
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  document.cookie = `${ADMIN_FLAG_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  // Remove o cookie antigo, que carregava o token em texto puro.
  document.cookie = "admin_token=; path=/; max-age=0; SameSite=Lax";
}

export interface AdminOverview {
  mrr: number;
  arr: number;
  totalUsers: number;
  activeSubscribers: number;
  freeUsers: number;
  essencialUsers: number;
  proUsers: number;
  newUsersToday: number;
  newUsersThisMonth: number;
  churnThisMonth: number;
  churnRate: number;
  avgRevenuePerUser: number;
  totalAiCostThisMonth: number;
  avgAiCostPerUser: number;
}

export interface RevenueMonth {
  month: string;
  mrr: number;
  newSubscribers: number;
  churned: number;
  essencial: number;
  pro: number;
}

export interface AiCostMetrics {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  totalCostBrl: number;
  avgCostPerUserBrl: number;
  topConsumers: Array<{ userId: number; phone: string; costBrl: number; messages: number }>;
  byDay: Array<{ date: string; costBrl: number; messages: number }>;
  byIntent?: Array<{ intent: string; costBrl: number; messages: number; inputTokens: number; outputTokens: number }>;
}

export interface AdminUserListItem {
  id: number;
  phone: string;
  name: string | null;
  plan: string;
  status: string;
  createdAt: string;
  lastSeenAt: string | null;
  expensesAllTime: number;
  messagesThisMonth: number;
  aiCostThisMonth: number;
  isBlocked: boolean;
}

export interface AdminUserDetail {
  id: number;
  phone: string;
  name: string | null;
  subscription: { plan: string; status: string; expiresAt: string | null };
  createdAt: string;
  lastSeenAt: string | null;
  isBlocked: boolean;
  blockedReason: string | null;
  stats: { expensesAllTime: number; messagesThisMonth: number; aiCostThisMonth: number };
  creditCards: string[];
  messagesByDay: Array<{ date: string; count: number }>;
  intentHistory: Array<{
    date: string;
    detectedIntent: string | null;
    intentSource: string | null;
    inputTokens: number;
    outputTokens: number;
    costBrl: number;
    processedSuccessfully: boolean;
    createdAt: string;
  }>;
  aiUsageByMonth: Array<{ month: string; costBrl: number; messages: number }>;
  adminActions: Array<{ action: string; details: unknown; createdAt: string; adminName: string | null }>;
}

export async function adminLogin(email: string, password: string) {
  return adminFetch<{ token: string; expiresAt: string; adminName: string }>(
    "/api/admin/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
    null
  );
}

export async function adminLogout() {
  try {
    await adminFetch("/api/admin/auth/logout", { method: "POST" });
  } finally {
    clearAdminSession();
  }
}

export async function adminMe() {
  return adminFetch<{ id: number; name: string | null; email: string }>("/api/admin/auth/me");
}

export async function fetchAdminOverview() {
  return adminFetch<AdminOverview>("/api/admin/metrics/overview");
}

export async function fetchAdminRevenue(months = 6) {
  return adminFetch<RevenueMonth[]>(`/api/admin/metrics/revenue?months=${months}`);
}

export async function fetchAdminAiCost(period: "month" | "week" = "month") {
  return adminFetch<AiCostMetrics>(`/api/admin/metrics/ai-cost?period=${period}`);
}

export async function fetchAdminUsers(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  plan?: string;
  status?: string;
}) {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.pageSize) q.set("pageSize", String(params.pageSize));
  if (params.search) q.set("search", params.search);
  if (params.plan) q.set("plan", params.plan);
  if (params.status) q.set("status", params.status);
  return adminFetch<{ users: AdminUserListItem[]; total: number; page: number; pageSize: number }>(
    `/api/admin/users?${q.toString()}`
  );
}

export async function fetchAdminUserDetail(id: number) {
  return adminFetch<AdminUserDetail>(`/api/admin/users/${id}`);
}

export async function blockAdminUser(id: number, reason: string) {
  return adminFetch(`/api/admin/users/${id}/block`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function unblockAdminUser(id: number) {
  return adminFetch(`/api/admin/users/${id}/unblock`, { method: "POST" });
}

export async function cancelAdminUserSubscription(id: number) {
  return adminFetch(`/api/admin/users/${id}/cancel-subscription`, { method: "POST" });
}

export async function fetchAdminAiLogs(params: {
  page?: number;
  pageSize?: number;
  userId?: number;
  intent?: string;
  from?: string;
  to?: string;
}) {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.pageSize) q.set("pageSize", String(params.pageSize));
  if (params.userId) q.set("userId", String(params.userId));
  if (params.intent) q.set("intent", params.intent);
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  return adminFetch<{
    logs: Array<{
      id: number;
      userId: number;
      messageType: string;
      detectedIntent: string | null;
      intentSource: string | null;
      inputTokens: number;
      outputTokens: number;
      costBrl: number;
      processedSuccessfully: boolean;
      createdAt: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }>(`/api/admin/ai-logs?${q.toString()}`);
}

export function formatAdminCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Baixa o CSV autenticado por header. Um link direto não carregaria o
 * Authorization, e passar o token na query o exporia em logs e histórico.
 */
export async function downloadAdminAiLogsCsv(params: Record<string, string>) {
  const q = new URLSearchParams({ ...params, format: "csv" });
  const token = getAdminToken();

  const res = await fetch(`${getApiUrl()}/api/admin/ai-logs?${q.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new AdminApiError("Falha ao exportar CSV", res.status);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ai-logs.csv";
  link.click();
  URL.revokeObjectURL(url);
}
