"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AddTransactionMenu } from "@/components/add-transaction-menu";
import { DashboardShell } from "@/components/dashboard-shell";
import { FinanceTable } from "@/components/finance-table";
import { MonthNavigator } from "@/components/month-navigator";
import {
  mapExpenseToRow,
  mapIncomeToRow,
} from "@/components/transaction-form-modal";
import { useTransactionModal } from "@/hooks/use-transaction-modal";
import {
  fetchExpensesByMonth,
  fetchIncomeByMonth,
  formatCurrency,
} from "@/lib/api";
import { getToken } from "@/lib/auth";
import { monthQueryString, parseMonthFromSearchParams } from "@/lib/month";
import type { TransactionKind } from "@/lib/transactions";

type TransactionType = "entrada" | "saida";

function formatAccount(paymentMethod?: string, cardName?: string | null) {
  if (paymentMethod === "credito") return cardName ? `Crédito · ${cardName}` : "Crédito";
  if (paymentMethod === "debito") return "Débito";
  if (paymentMethod === "pix") return "Pix";
  return "Dinheiro";
}

function parseTransactionType(value: string | null): TransactionType {
  return value === "saida" ? "saida" : "entrada";
}

function TransactionTabs({
  tipo,
  month,
}: {
  tipo: TransactionType;
  month: { year: number; month: number };
}) {
  const tabs: { id: TransactionType; label: string }[] = [
    { id: "entrada", label: "Entradas" },
    { id: "saida", label: "Saídas" },
  ];

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = tipo === tab.id;
        const href = `/dashboard/transacoes?${monthQueryString(month, { tipo: tab.id })}`;
        return (
          <a
            key={tab.id}
            href={href}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${
              active
                ? tab.id === "entrada"
                  ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40"
                  : "bg-red-500/20 text-red-400 ring-1 ring-red-500/40"
                : "border border-bento-gold/20 text-bento-offwhite/60 hover:border-bento-gold/40 hover:text-bento-offwhite"
            }`}
          >
            {tab.label}
          </a>
        );
      })}
    </div>
  );
}

function TransacoesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const month = parseMonthFromSearchParams(searchParams);
  const tipo = parseTransactionType(searchParams.get("tipo"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<ReturnType<typeof mapIncomeToRow>[]>([]);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (tipo === "entrada") {
        const data = await fetchIncomeByMonth(token, month.year, month.month);
        setTotal(data.total);
        setRows(data.income.map(mapIncomeToRow));
      } else {
        const data = await fetchExpensesByMonth(token, month.year, month.month);
        setTotal(data.total);
        setRows(data.expenses.map((item) => mapExpenseToRow(item, formatAccount)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar transações");
    } finally {
      setLoading(false);
    }
  }, [month.month, month.year, router, tipo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { openCreate, openEdit, handleDelete, modal } = useTransactionModal(loadData);

  const isEntrada = tipo === "entrada";
  const addKinds: TransactionKind[] = isEntrada
    ? ["income"]
    : ["expense", "credit_expense"];

  return (
    <DashboardShell title="Transações">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex-1">
          <MonthNavigator
            basePath="/dashboard/transacoes"
            extraParams={{ tipo }}
          />
        </div>
        <AddTransactionMenu
          variant="inline"
          allowedKinds={addKinds}
          onSelect={openCreate}
        />
      </div>

      <TransactionTabs tipo={tipo} month={month} />

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <p className="mb-4 text-sm text-bento-offwhite/50">
        Total do mês ({isEntrada ? "entradas" : "saídas"}):{" "}
        <span
          className={`font-semibold ${isEntrada ? "text-emerald-400" : "text-red-400"}`}
        >
          {formatCurrency(total)}
        </span>
      </p>

      {loading ? (
        <p className="py-16 text-center text-bento-offwhite/40">Carregando...</p>
      ) : (
        <FinanceTable
          rows={rows}
          amountVariant={isEntrada ? "income" : "expense"}
          emptyMessage={
            isEntrada ? "Nenhuma entrada neste mês" : "Nenhuma saída neste mês"
          }
          dailySummary={(_date, totalDay) =>
            isEntrada
              ? `Neste dia você recebeu ${formatCurrency(totalDay)}`
              : `Neste dia você gastou ${formatCurrency(totalDay)}`
          }
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}
      {modal}
    </DashboardShell>
  );
}

export default function TransacoesPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-bento-offwhite/40">Carregando...</p>}>
      <TransacoesContent />
    </Suspense>
  );
}
