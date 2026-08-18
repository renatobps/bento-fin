"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  formatAdminCurrency,
  type AiCostMetrics,
} from "@/lib/admin-api";

export default function AdminAiCostsPage() {
  const [data, setData] = useState<AiCostMetrics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAdminAiCost("month")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro"));
  }, []);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return <p className="text-slate-500">Carregando...</p>;

  const avgPerMessage =
    data.byDay.reduce((s, d) => s + d.messages, 0) > 0
      ? data.totalCostBrl / data.byDay.reduce((s, d) => s + d.messages, 0)
      : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-slate-100">Custo de IA</h1>
        <p className="mt-1 text-sm text-slate-500">Análise de tokens e custos Claude Haiku</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Custo (BRL)" value={formatAdminCurrency(data.totalCostBrl)} />
        <MetricCard label="Custo (USD)" value={`US$ ${data.totalCostUsd.toFixed(2)}`} />
        <MetricCard label="Tokens entrada" value={data.totalInputTokens.toLocaleString("pt-BR")} />
        <MetricCard label="Custo médio / msg" value={formatAdminCurrency(avgPerMessage)} />
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-900/80 p-5">
        <h2 className="mb-4 font-display text-lg text-slate-200">Custo por dia</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.byDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <Tooltip formatter={(v) => formatAdminCurrency(Number(v))} />
            <Line type="monotone" dataKey="costBrl" stroke="#f59e0b" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/80 p-5">
          <h2 className="mb-4 font-display text-lg text-slate-200">Top consumidores</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="pb-2">Telefone</th>
                <th className="pb-2">Msgs</th>
                <th className="pb-2">Custo</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {data.topConsumers.slice(0, 20).map((c) => (
                <tr key={c.userId} className="border-t border-slate-800">
                  <td className="py-2">
                    <Link href={`/admin/users/${c.userId}`} className="text-amber-400 hover:underline">
                      {c.phone}
                    </Link>
                  </td>
                  <td className="py-2">{c.messages}</td>
                  <td className="py-2">{formatAdminCurrency(c.costBrl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-900/80 p-5">
          <h2 className="mb-4 font-display text-lg text-slate-200">Por intent</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="pb-2">Intent</th>
                <th className="pb-2">Msgs</th>
                <th className="pb-2">Custo</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {(data.byIntent ?? []).map((row) => (
                <tr key={row.intent} className="border-t border-slate-800">
                  <td className="py-2">{row.intent}</td>
                  <td className="py-2">{row.messages}</td>
                  <td className="py-2">{formatAdminCurrency(row.costBrl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
