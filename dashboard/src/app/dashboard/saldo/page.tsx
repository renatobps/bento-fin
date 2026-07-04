"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AddTransactionMenu } from "@/components/add-transaction-menu";
import { DashboardShell } from "@/components/dashboard-shell";
import { FinanceTable, type FinanceTableRow } from "@/components/finance-table";
import { MonthNavigator } from "@/components/month-navigator";
import { useTransactionModal } from "@/hooks/use-transaction-modal";
import { fetchLedger, formatCurrency } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { parseMonthFromSearchParams } from "@/lib/month";

function mapLedgerEntry(entry: Awaited<ReturnType<typeof fetchLedger>>["entries"][number]): FinanceTableRow {
  return {
    id: entry.id,
    entryType: entry.type,
    numericId: entry.numericId,
    categoryId: entry.categoryId,
    paymentMethod: entry.paymentMethod,
    cardName: entry.cardName,
    date: entry.date,
    description: entry.description,
    category: entry.category,
    categoryIcon: entry.categoryIcon,
    account: entry.account,
    amount: entry.amount,
  };
}

function SaldoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const month = parseMonthFromSearchParams(searchParams);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<FinanceTableRow[]>([]);
  const [availableBalance, setAvailableBalance] = useState(0);

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await fetchLedger(token, month.year, month.month);
      setAvailableBalance(data.availableBalance);
      setRows(data.entries.map(mapLedgerEntry));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar extrato");
    } finally {
      setLoading(false);
    }
  }, [month.month, month.year, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { openCreate, openEdit, handleDelete, modal } = useTransactionModal(loadData);

  return (
    <DashboardShell title="Saldo atual">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex-1">
          <MonthNavigator basePath="/dashboard/saldo" />
        </div>
        <AddTransactionMenu variant="inline" onSelect={openCreate} />
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      <p className="mb-4 text-sm text-bento-offwhite/50">
        Saldo disponível:{" "}
        <span className="font-semibold text-blue-400">
          {formatCurrency(availableBalance)}
        </span>
      </p>
      {loading ? (
        <p className="py-16 text-center text-bento-offwhite/40">Carregando...</p>
      ) : (
        <FinanceTable
          rows={rows}
          amountVariant="mixed"
          emptyMessage="Nenhuma movimentação neste mês"
          dailySummary={(date, totalDay) => {
            const label = totalDay >= 0 ? "saldo positivo" : "saldo negativo";
            return `${formatExpenseDateLabel(date)}: ${label} de ${formatCurrency(Math.abs(totalDay))}`;
          }}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}
      {modal}
    </DashboardShell>
  );
}

function formatExpenseDateLabel(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export default function SaldoPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-bento-offwhite/40">Carregando...</p>}>
      <SaldoContent />
    </Suspense>
  );
}
