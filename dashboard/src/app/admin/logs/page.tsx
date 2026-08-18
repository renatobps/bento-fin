"use client";

import { useCallback, useEffect, useState } from "react";
import {
  downloadAdminAiLogsCsv,
  fetchAdminAiLogs,
  formatAdminCurrency,
} from "@/lib/admin-api";

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<Array<{
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
  }>>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState("");
  const [intent, setIntent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminAiLogs({
        page,
        pageSize: 50,
        userId: userId ? parseInt(userId, 10) : undefined,
        intent: intent || undefined,
      });
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [page, userId, intent]);

  useEffect(() => {
    load();
  }, [load]);

  async function exportCsv() {
    const params: Record<string, string> = { page: "1", pageSize: "1000" };
    if (userId) params.userId = userId;
    if (intent) params.intent = intent;

    try {
      await downloadAdminAiLogsCsv(params);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao exportar CSV");
    }
  }

  const totalPages = Math.max(Math.ceil(total / 50), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-slate-100">Logs de IA</h1>
          <p className="mt-1 text-sm text-slate-500">Metadados sem conteúdo das mensagens</p>
        </div>
        <button type="button" onClick={exportCsv} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500">
          Exportar CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="number"
          placeholder="User ID"
          value={userId}
          onChange={(e) => { setUserId(e.target.value); setPage(1); }}
          className="w-32 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
        />
        <input
          type="text"
          placeholder="Intent"
          value={intent}
          onChange={(e) => { setIntent(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
        />
      </div>

      {error && <p className="text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-900 text-left text-slate-500">
            <tr>
              <th className="px-3 py-3">Data</th>
              <th className="px-3 py-3">User</th>
              <th className="px-3 py-3">Tipo</th>
              <th className="px-3 py-3">Intent</th>
              <th className="px-3 py-3">Fonte</th>
              <th className="px-3 py-3">Tokens</th>
              <th className="px-3 py-3">Custo</th>
              <th className="px-3 py-3">OK</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/50 text-slate-300">
            {loading ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">Carregando...</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id}>
                <td className="px-3 py-2 whitespace-nowrap">{log.createdAt.slice(0, 19).replace("T", " ")}</td>
                <td className="px-3 py-2">{log.userId}</td>
                <td className="px-3 py-2">{log.messageType}</td>
                <td className="px-3 py-2">{log.detectedIntent ?? "—"}</td>
                <td className="px-3 py-2">{log.intentSource ?? "—"}</td>
                <td className="px-3 py-2">{log.inputTokens + log.outputTokens}</td>
                <td className="px-3 py-2">{formatAdminCurrency(log.costBrl)}</td>
                <td className="px-3 py-2">{log.processedSuccessfully ? "✓" : "✗"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-700 px-3 py-1 text-sm disabled:opacity-40">Anterior</button>
        <span className="text-sm text-slate-500">{page} / {totalPages} ({total} registros)</span>
        <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-700 px-3 py-1 text-sm disabled:opacity-40">Próxima</button>
      </div>
    </div>
  );
}
