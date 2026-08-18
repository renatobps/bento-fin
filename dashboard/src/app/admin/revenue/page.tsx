"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MetricCard } from "@/components/admin/metric-card";
import {
  fetchAdminOverview,
  fetchAdminRevenue,
  formatAdminCurrency,
  type RevenueMonth,
} from "@/lib/admin-api";

export default function AdminRevenuePage() {
  const [history, setHistory] = useState<RevenueMonth[]>([]);
  const [mrr, setMrr] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetchAdminRevenue(12), fetchAdminOverview()])
      .then(([rev, ov]) => {
        setHistory(rev);
        setMrr(ov.mrr);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro"));
  }, []);

  const momGrowth =
    history.length >= 2
      ? ((history[history.length - 1].mrr - history[history.length - 2].mrr) /
          Math.max(history[history.length - 2].mrr, 1)) *
        100
      : 0;

  const lastMonth = history[history.length - 1];

  if (error) return <p className="text-red-400">{error}</p>;
  if (!history.length) return <p className="text-slate-500">Carregando...</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-slate-100">Receita</h1>
        <p className="mt-1 text-sm text-slate-500">MRR e assinaturas</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="MRR atual" value={formatAdminCurrency(mrr)} />
        <MetricCard label="Crescimento MoM" value={`${momGrowth.toFixed(1)}%`} />
        <MetricCard label="Novos assinantes" value={String(lastMonth?.newSubscribers ?? 0)} />
        <MetricCard label="Churned" value={String(lastMonth?.churned ?? 0)} />
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-900/80 p-5">
        <h2 className="mb-4 font-display text-lg text-slate-200">MRR — 12 meses</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <Tooltip formatter={(v) => formatAdminCurrency(Number(v))} />
            <Line type="monotone" dataKey="mrr" stroke="#f59e0b" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-900/80 p-5">
        <h2 className="mb-4 font-display text-lg text-slate-200">Essencial vs Pro</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="essencial" stackId="a" fill="#34d399" name="Essencial" />
            <Bar dataKey="pro" stackId="a" fill="#60a5fa" name="Pro" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
