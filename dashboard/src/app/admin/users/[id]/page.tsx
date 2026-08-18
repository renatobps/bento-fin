"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MetricCard } from "@/components/admin/metric-card";
import {
  blockAdminUser,
  cancelAdminUserSubscription,
  fetchAdminUserDetail,
  formatAdminCurrency,
  unblockAdminUser,
  type AdminUserDetail,
} from "@/lib/admin-api";

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = parseInt(String(params.id), 10);
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"block" | "cancel" | null>(null);
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setUser(await fetchAdminUserDetail(userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleBlock() {
    if (!reason.trim()) return;
    setActionLoading(true);
    try {
      await blockAdminUser(userId, reason.trim());
      setModal(null);
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao bloquear");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUnblock() {
    setActionLoading(true);
    try {
      await unblockAdminUser(userId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao desbloquear");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelSub() {
    setActionLoading(true);
    try {
      await cancelAdminUserSubscription(userId);
      setModal(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cancelar");
    } finally {
      setActionLoading(false);
    }
  }

  if (error && !user) return <p className="text-red-400">{error}</p>;
  if (!user) return <p className="text-slate-500">Carregando...</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-slate-100">{user.phone}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {user.name ?? "Sem nome"} · Plano {user.subscription.plan} · {user.subscription.status}
          {user.subscription.expiresAt && (
            <> · Vencimento {user.subscription.expiresAt.slice(0, 10)}</>
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Gastos registrados" value={String(user.stats.expensesAllTime)} />
        <MetricCard label="Mensagens (mês)" value={String(user.stats.messagesThisMonth)} />
        <MetricCard label="Custo IA (mês)" value={formatAdminCurrency(user.stats.aiCostThisMonth)} />
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-900/80 p-5">
        <h2 className="mb-4 font-display text-lg text-slate-200">Mensagens por dia (30 dias)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={user.messagesByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-900/80 p-5">
        <h2 className="mb-4 font-display text-lg text-slate-200">Histórico de intents (30 dias)</h2>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="pb-2">Data</th>
                <th className="pb-2">Intent</th>
                <th className="pb-2">Fonte</th>
                <th className="pb-2">Tokens</th>
                <th className="pb-2">Custo</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {user.intentHistory.map((row, i) => (
                <tr key={i} className="border-t border-slate-800">
                  <td className="py-2">{row.date}</td>
                  <td className="py-2">{row.detectedIntent ?? "—"}</td>
                  <td className="py-2">{row.intentSource ?? "—"}</td>
                  <td className="py-2">{row.inputTokens + row.outputTokens}</td>
                  <td className="py-2">{formatAdminCurrency(row.costBrl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {user.creditCards.length > 0 && (
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/80 p-5">
          <h2 className="mb-2 font-display text-lg text-slate-200">Cartões</h2>
          <p className="text-sm text-slate-400">{user.creditCards.join(", ")}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {!user.isBlocked ? (
          <button type="button" onClick={() => setModal("block")} className="rounded-lg bg-red-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-red-600">
            Bloquear usuário
          </button>
        ) : (
          <button type="button" disabled={actionLoading} onClick={handleUnblock} className="rounded-lg bg-emerald-600/80 px-4 py-2 text-sm font-medium text-white">
            Desbloquear
          </button>
        )}
        {user.subscription.plan !== "free" && user.subscription.status === "active" && (
          <button type="button" onClick={() => setModal("cancel")} className="rounded-lg border border-amber-500/50 px-4 py-2 text-sm text-amber-400">
            Cancelar assinatura
          </button>
        )}
      </div>

      {user.adminActions.length > 0 && (
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/80 p-5">
          <h2 className="mb-4 font-display text-lg text-slate-200">Ações admin</h2>
          <ul className="space-y-2 text-sm text-slate-400">
            {user.adminActions.map((a, i) => (
              <li key={i}>
                {a.createdAt.slice(0, 16).replace("T", " ")} — {a.action} por {a.adminName ?? "admin"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {modal === "block" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6">
            <h3 className="text-lg text-slate-100">Bloquear usuário</h3>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo..."
              className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200"
              rows={3}
            />
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => setModal(null)} className="flex-1 rounded-lg border border-slate-600 py-2 text-sm">Cancelar</button>
              <button type="button" disabled={actionLoading} onClick={handleBlock} className="flex-1 rounded-lg bg-red-600 py-2 text-sm text-white">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {modal === "cancel" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6">
            <h3 className="text-lg text-slate-100">Cancelar assinatura no Stripe?</h3>
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => setModal(null)} className="flex-1 rounded-lg border border-slate-600 py-2 text-sm">Voltar</button>
              <button type="button" disabled={actionLoading} onClick={handleCancelSub} className="flex-1 rounded-lg bg-amber-500 py-2 text-sm text-slate-950">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
