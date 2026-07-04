"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
  fetchSubscription,
  formatCurrency,
  isAuthError,
  isPlanRestrictedError,
  type SubscriptionInfo,
} from "@/lib/api";
import { clearSession, getToken } from "@/lib/auth";
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
  return value === "entrada" ? "entrada" : "saida";
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
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [showIncomeUpgradePrompt, setShowIncomeUpgradePrompt] = useState(false);

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError("");
    setShowIncomeUpgradePrompt(false);

    try {
      const sub = await fetchSubscription(token);
      setSubscription(sub);

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
      if (isAuthError(err)) {
        clearSession();
        router.replace("/login");
        return;
      }
      if (isPlanRestrictedError(err)) {
        setError("Recurso disponível a partir do plano Essencial.");
        return;
      }
      setError(err instanceof Error ? err.message : "Erro ao carregar transações");
    } finally {
      setLoading(false);
    }
  }, [month.month, month.year, router, tipo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { openCreate, openEdit, handleDelete, modal } = useTransactionModal(loadData, {
    subscription,
    onIncomeLimitReached: () => setShowIncomeUpgradePrompt(true),
  });

  const isEntrada = tipo === "entrada";
  const addKinds: TransactionKind[] = isEntrada
    ? ["income"]
    : ["expense", "credit_expense"];

  const incomeLimit = subscription?.usage.limits.income ?? 10;
  const incomeUsed = subscription?.usage.incomeThisMonth ?? 0;
  const incomeRemaining = Math.max(0, incomeLimit - incomeUsed);
  const incomeLimitReached =
    subscription?.plan === "free" && incomeRemaining === 0;

  const handleAddIncome = (kind: TransactionKind) => {
    if (isEntrada && incomeLimitReached) {
      setShowIncomeUpgradePrompt(true);
      return;
    }
    openCreate(kind);
  };

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
          onSelect={isEntrada ? handleAddIncome : openCreate}
        />
      </div>

      <TransactionTabs tipo={tipo} month={month} />

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {isEntrada && subscription?.plan === "free" && !showIncomeUpgradePrompt && (
        <div className="mb-4 rounded-xl border border-bento-gold/20 bg-bento-gold/5 px-4 py-3 text-sm text-bento-offwhite/80">
          Plano gratuito —{" "}
          <span className="font-medium text-bento-gold">
            {incomeRemaining}{" "}
            {incomeRemaining === 1 ? "receita restante" : "receitas restantes"}
          </span>{" "}
          de {incomeLimit} este mês.
        </div>
      )}

      {showIncomeUpgradePrompt && (
        <div className="mb-4 rounded-xl border border-bento-gold/30 bg-bento-gold/10 px-4 py-3 text-sm text-bento-offwhite">
          {incomeLimitReached
            ? `Você atingiu o limite de ${incomeLimit} receitas no plano gratuito este mês.`
            : "Para registrar receitas ilimitadas, assine o plano Essencial por R$14,90/mês."}{" "}
          <Link href="/planos" className="font-semibold text-bento-gold hover:underline">
            Ver planos
          </Link>
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
