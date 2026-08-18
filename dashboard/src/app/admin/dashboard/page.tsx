"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MetricCard } from "@/components/admin/metric-card";
import {
  fetchAdminAiCost,
  fetchAdminOverview,
  fetchAdminRevenue,
  formatAdminCurrency,
  type AdminOverview,
} from "@/lib/admin-api";

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [revenue, setRevenue] = useState<Array<{ month: string; mrr: number }>>([]);
  const [topConsumers, setTopConsumers] = useState<
    Array<{ userId: number; phone: string; costBrl: number; messages: number }>
  >([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetchAdminOverview(), fetchAdminRevenue(6), fetchAdminAiCost()])
      .then(([ov, rev, ai]) => {
        setOverview(ov);
        setRevenue(rev.map((r) => ({ month: r.month, mrr: r.mrr })));
        setTopConsumers(ai.topConsumers.slice(0, 5));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar"));
  }, []);

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  if (!overview) {
    return <p className="text-slate-500">Carregando...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-slate-100">Visão geral</h1>
        <p className="mt-1 text-sm text-slate-500">Métricas de negócio em tempo real</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="MRR" value={formatAdminCurrency(overview.mrr)} />
        <MetricCard label="ARR" value={formatAdminCurrency(overview.arr)} />
        <MetricCard label="Assinantes" value={String(overview.activeSubscribers)} />
        <MetricCard label="Usuários free" value={String(overview.freeUsers)} />
        <MetricCard label="Novos (mês)" value={String(overview.newUsersThisMonth)} />
        <MetricCard label="Churn" value={`${overview.churnRate}%`} hint={`${overview.churnThisMonth} cancelamentos`} />
        <MetricCard label="Custo IA (mês)" value={formatAdminCurrency(overview.totalAiCostThisMonth)} />
        <MetricCard label="Custo IA / usuário" value={formatAdminCurrency(overview.avgAiCostPerUser)} />
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-900/80 p-5">
        <h2 className="mb-4 font-display text-lg text-slate-200">MRR — últimos 6 meses</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={revenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
            <Tooltip formatter={(v) => formatAdminCurrency(Number(v))} />
            <Line type="monotone" dataKey="mrr" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-900/80 p-5">
        <h2 className="mb-4 font-display text-lg text-slate-200">Top 5 consumidores de IA (mês)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-slate-500">
                <th className="pb-2 pr-4">Telefone</th>
                <th className="pb-2 pr-4">Mensagens</th>
                <th className="pb-2">Custo</th>
              </tr>
            </thead>
            <tbody>
              {topConsumers.map((c) => (
                <tr key={c.userId} className="border-b border-slate-800 text-slate-300">
                  <td className="py-2 pr-4">{c.phone}</td>
                  <td className="py-2 pr-4">{c.messages}</td>
                  <td className="py-2">{formatAdminCurrency(c.costBrl)}</td>
                </tr>
              ))}
              {topConsumers.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-slate-500">Sem dados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
