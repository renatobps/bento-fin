"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AddTransactionMenu } from "@/components/add-transaction-menu";
import { FinanceOverviewCards } from "@/components/finance-overview-cards";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  DashboardReports,
  type CreditCardUsage,
} from "@/components/dashboard-reports";
import { MonthNavigator } from "@/components/month-navigator";
import { useTransactionModal } from "@/hooks/use-transaction-modal";
import {
  fetchBalance,
  fetchCreditCards,
  fetchExpensesByMonth,
  fetchIncomeByMonth,
  formatCurrency,
} from "@/lib/api";
import { groupByCategory } from "@/lib/aggregations";
import { parseMonthFromSearchParams } from "@/lib/month";
import { getToken } from "@/lib/auth";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const month = parseMonthFromSearchParams(searchParams);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState<Awaited<ReturnType<typeof fetchBalance>> | null>(null);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [expenseCategories, setExpenseCategories] = useState(
    [] as ReturnType<typeof groupByCategory>
  );
  const [incomeCategories, setIncomeCategories] = useState(
    [] as ReturnType<typeof groupByCategory>
  );
  const [creditCards, setCreditCards] = useState<CreditCardUsage[]>([]);

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [balanceData, incomeData, expensesData, cardsData] = await Promise.all([
        fetchBalance(token),
        fetchIncomeByMonth(token, month.year, month.month),
        fetchExpensesByMonth(token, month.year, month.month),
        fetchCreditCards(token),
      ]);

      const debtByCard = new Map(
        balanceData.creditByCard.map((c) => [c.cardName.toLowerCase(), c.total])
      );

      setBalance(balanceData);
      setIncomeTotal(incomeData.total);
      setExpensesTotal(expensesData.total);
      setExpenseCategories(groupByCategory(expensesData.expenses));
      setIncomeCategories(groupByCategory(incomeData.income));
      setCreditCards(
        cardsData.cards.map((card) => ({
          name: card.name,
          limit: card.creditLimit,
          used: debtByCard.get(card.name.toLowerCase()) ?? 0,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [router, month.year, month.month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const { openCreate, modal } = useTransactionModal(loadData);

  return (
    <DashboardShell title="Dashboard">
      <MonthNavigator basePath="/dashboard" />

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="py-20 text-center text-bento-offwhite/40">Carregando...</p>
      ) : (
        <>
          <FinanceOverviewCards
            balance={balance}
            incomeTotal={incomeTotal}
            expensesTotal={expensesTotal}
          />
          {balance && (
            <p className="mt-4 text-center text-sm text-bento-offwhite/40">
              Saldo disponível:{" "}
              <span className="font-semibold text-bento-offwhite">
                {formatCurrency(balance.availableBalance)}
              </span>
            </p>
          )}

          <DashboardReports
            incomeTotal={incomeTotal}
            expensesTotal={expensesTotal}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
            creditCards={creditCards}
          />
        </>
      )}
      <AddTransactionMenu variant="fab" onSelect={openCreate} />
      {modal}
    </DashboardShell>
  );
}

export default function DashboardHomePage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-bento-offwhite/40">Carregando...</p>}>
      <DashboardContent />
    </Suspense>
  );
}
