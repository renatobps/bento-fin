"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  fetchAdminUsers,
  formatAdminCurrency,
  type AdminUserListItem,
} from "@/lib/admin-api";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminUsers({ page, pageSize: 20, search, plan, status });
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [page, search, plan, status]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(Math.ceil(total / 20), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-slate-100">Usuários</h1>
        <p className="mt-1 text-sm text-slate-500">{total} usuários</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Buscar telefone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
        />
        <select value={plan} onChange={(e) => { setPlan(e.target.value); setPage(1); }} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
          <option value="all">Todos os planos</option>
          <option value="free">Free</option>
          <option value="essencial">Essencial</option>
          <option value="pro">Pro</option>
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
          <option value="all">Todos os status</option>
          <option value="active">Active</option>
          <option value="canceled">Canceled</option>
          <option value="past_due">Past due</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {error && <p className="text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-slate-900 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Criado</th>
              <th className="px-4 py-3">Último acesso</th>
              <th className="px-4 py-3">Msgs/mês</th>
              <th className="px-4 py-3">IA/mês</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/50 text-slate-300">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Carregando...</td></tr>
            ) : users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">{u.phone}</td>
                <td className="px-4 py-3 capitalize">{u.plan}</td>
                <td className="px-4 py-3">{u.status}</td>
                <td className="px-4 py-3">{u.createdAt}</td>
                <td className="px-4 py-3">{u.lastSeenAt ?? "—"}</td>
                <td className="px-4 py-3">{u.messagesThisMonth}</td>
                <td className="px-4 py-3">{formatAdminCurrency(u.aiCostThisMonth)}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/users/${u.id}`} className="text-amber-400 hover:underline">
                    Detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-700 px-3 py-1 text-sm disabled:opacity-40">Anterior</button>
        <span className="text-sm text-slate-500">Página {page} de {totalPages}</span>
        <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-700 px-3 py-1 text-sm disabled:opacity-40">Próxima</button>
      </div>
    </div>
  );
}
