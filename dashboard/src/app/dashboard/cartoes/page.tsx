"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AddTransactionMenu } from "@/components/add-transaction-menu";
import { CreditCardsPanel } from "@/components/credit-cards";
import { DashboardShell } from "@/components/dashboard-shell";
import { FinanceTable } from "@/components/finance-table";
import { MonthNavigator } from "@/components/month-navigator";
import { mapExpenseToRow } from "@/components/transaction-form-modal";
import { useTransactionModal } from "@/hooks/use-transaction-modal";
import {
  fetchBalance,
  fetchCreditTransactionsByMonth,
  formatCurrency,
} from "@/lib/api";
import { getToken } from "@/lib/auth";
import { parseMonthFromSearchParams } from "@/lib/month";

function formatAccount(paymentMethod?: string, cardName?: string | null) {
  if (paymentMethod === "credito") return cardName ? `Crédito · ${cardName}` : "Crédito";
  return "Crédito";
}

function CartoesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const month = parseMonthFromSearchParams(searchParams);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<ReturnType<typeof mapExpenseToRow>[]>([]);
  const [total, setTotal] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [txData, balance] = await Promise.all([
        fetchCreditTransactionsByMonth(token, month.year, month.month),
        fetchBalance(token),
      ]);
      setTotal(txData.total);
      setTotalDebt(balance.totalCreditDebt);
      setRows(
        txData.transactions.map((item) =>
          mapExpenseToRow(
            { ...item, paymentMethod: "credito" },
            formatAccount
          )
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar cartões");
    } finally {
      setLoading(false);
    }
  }, [month.month, month.year, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { openCreate, openEdit, handleDelete, modal } = useTransactionModal(loadData);

  return (
    <DashboardShell title="Cartões">
      <CreditCardsPanel />

      <div className="mt-8">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="font-display text-lg text-bento-offwhite">
              Despesas no cartão
            </h2>
            <p className="mt-1 text-sm text-bento-offwhite/50">
              Lançamentos de crédito do mês selecionado
            </p>
          </div>
          <AddTransactionMenu
            variant="inline"
            allowedKinds={["credit_expense"]}
            onSelect={openCreate}
          />
        </div>

        <MonthNavigator basePath="/dashboard/cartoes" />

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-4 text-sm text-bento-offwhite/50">
          <span>
            Gastos no crédito (mês):{" "}
            <strong className="text-teal-400">{formatCurrency(total)}</strong>
          </span>
          <span>
            Dívida total:{" "}
            <strong className="text-bento-offwhite">{formatCurrency(totalDebt)}</strong>
          </span>
        </div>

        {loading ? (
          <p className="py-16 text-center text-bento-offwhite/40">Carregando...</p>
        ) : (
          <FinanceTable
            rows={rows}
            amountVariant="expense"
            emptyMessage="Nenhum gasto no crédito neste mês"
            dailySummary={(_date, totalDay) =>
              `Neste dia você gastou ${formatCurrency(totalDay)} no crédito`
            }
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        )}
      </div>
      {modal}
    </DashboardShell>
  );
}

export default function CartoesPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-bento-offwhite/40">Carregando...</p>}>
      <CartoesContent />
    </Suspense>
  );
}
