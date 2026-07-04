"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AddTransactionMenu } from "@/components/add-transaction-menu";
import { FinanceOverviewCards } from "@/components/finance-overview-cards";
import { DashboardShell } from "@/components/dashboard-shell";
import { PlanBanner } from "@/components/plan-banner";
import { UpgradeToast } from "@/components/upgrade-toast";
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
  fetchProfile,
  fetchSubscription,
  formatCurrency,
  isAuthError,
  type SubscriptionInfo,
} from "@/lib/api";
import { clearSession } from "@/lib/auth";
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
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [phoneDisplay, setPhoneDisplay] = useState("");

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const profile = await fetchProfile(token);
      setPhoneDisplay(profile.phoneDisplay || profile.phone);

      const sub = await fetchSubscription(token);
      setSubscription(sub);
      const isFree = sub.plan === "free";

      const [balanceResult, expensesResult] = await Promise.all([
        fetchBalance(token),
        fetchExpensesByMonth(token, month.year, month.month),
      ]);

      setBalance(balanceResult);
      setExpensesTotal(expensesResult.total);
      setExpenseCategories(groupByCategory(expensesResult.expenses));

      const incomeData = await fetchIncomeByMonth(token, month.year, month.month);
      setIncomeTotal(incomeData.total);
      setIncomeCategories(groupByCategory(incomeData.income));

      if (!isFree) {
        const cardsData = await fetchCreditCards(token);
        const debtByCard = new Map(
          balanceResult.creditByCard.map((c) => [c.cardName.toLowerCase(), c.total])
        );
        setCreditCards(
          cardsData.cards.map((card) => ({
            name: card.name,
            limit: card.creditLimit,
            used: debtByCard.get(card.name.toLowerCase()) ?? 0,
          }))
        );
      } else {
        setCreditCards([]);
      }
    } catch (err) {
      if (isAuthError(err)) {
        clearSession();
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [router, month.year, month.month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    function onFocus() {
      loadData();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadData]);

  const { openCreate, modal } = useTransactionModal(loadData, { subscription });
  const isFree = subscription?.plan === "free";

  return (
    <DashboardShell title="Dashboard">
      <UpgradeToast />
      <PlanBanner subscription={subscription} />
      <MonthNavigator basePath="/dashboard" />

      {phoneDisplay && (
        <p className="mb-4 text-center text-xs text-bento-offwhite/40">
          Conta: {phoneDisplay} — use o mesmo número do WhatsApp
        </p>
      )}

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
            isFreePlan={isFree}
          />
          {balance && (
            <p className="mt-4 text-center text-sm text-bento-offwhite/40">
              Saldo disponível:{" "}
              <span className="font-semibold text-bento-offwhite">
                {formatCurrency(balance.availableBalance)}
              </span>
            </p>
          )}

          {expensesTotal === 0 && (subscription?.usage.expensesThisMonth ?? 0) === 0 && (
            <p className="mt-4 text-center text-sm text-bento-offwhite/50">
              Nenhum gasto neste mês. Registre pelo WhatsApp:{" "}
              <span className="text-bento-gold">gastei 30 no almoço</span>
            </p>
          )}

          {isFree && expensesTotal > 0 && (
            <p className="mt-4 text-center text-sm">
              <Link href="/dashboard/transacoes?tipo=saida" className="text-bento-gold hover:underline">
                Ver todas as despesas →
              </Link>
            </p>
          )}

          <DashboardReports
            incomeTotal={incomeTotal}
            expensesTotal={expensesTotal}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
            creditCards={creditCards}
            hideIncome={false}
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
