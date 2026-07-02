"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BalanceCard,
  CategoryChart,
  CreditSummary,
  ExpenseList,
  IncomeList,
  PeriodFilter,
} from "@/components/dashboard";
import { BrandLogo } from "@/components/brand-logo";
import { SpendingLimitsPanel } from "@/components/spending-limits";
import {
  fetchBalance,
  fetchExpenses,
  fetchIncome,
  fetchSummary,
  formatCurrency,
  type Period,
  type ExpensesResponse,
  type SummaryResponse,
  type IncomeResponse,
  type BalanceSummary,
} from "@/lib/api";
import { clearSession, getToken, getUser, type StoredUser } from "@/lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("mes");
  const [expenses, setExpenses] = useState<ExpensesResponse | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [income, setIncome] = useState<IncomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<StoredUser | null>(null);

  const loadData = useCallback(async (p: Period) => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [expData, sumData, balanceData, incomeData] = await Promise.all([
        fetchExpenses(token, p),
        fetchSummary(token, p),
        fetchBalance(token),
        fetchIncome(token, p),
      ]);
      setExpenses(expData);
      setSummary(sumData);
      setBalance(balanceData);
      setIncome(incomeData);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Token")) {
        clearSession();
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    setUser(getUser());

    if (!getToken()) {
      router.replace("/login");
      return;
    }
    loadData(period);
  }, [period, loadData, router]);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <div className="min-h-full bg-bento-navy">
      <header className="border-b border-bento-gold/15 bg-bento-navy-muted">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <BrandLogo size="sm" />
          <div className="flex items-center gap-4">
            <p className="hidden text-xs text-bento-offwhite/50 sm:block">
              {user?.phone ?? ""}
            </p>
            <button
              onClick={handleLogout}
              className="text-sm text-bento-offwhite/60 transition hover:text-bento-gold"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <BalanceCard balance={balance} />

        <div className="mb-6">
          <PeriodFilter period={period} onChange={setPeriod} />
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-bento-offwhite/40">
            Carregando...
          </div>
        ) : (
          <>
            <div className="mb-6 rounded-2xl border border-bento-gold/25 bg-gradient-to-br from-bento-navy-muted to-bento-navy p-6 shadow-xl shadow-black/20">
              <p className="text-sm font-medium uppercase tracking-widest text-bento-gold">
                Total do período
              </p>
              <p className="mt-2 font-display text-4xl text-bento-offwhite">
                {formatCurrency(summary?.total ?? 0)}
              </p>
              <p className="mt-2 text-sm text-bento-offwhite/50">
                {expenses?.expenses.length ?? 0} gasto(s) registrado(s)
              </p>
            </div>

            <div className="mb-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-bento-gold/10 bg-bento-navy-muted p-6">
                <h2 className="mb-4 font-display text-lg text-bento-offwhite">
                  Por categoria
                </h2>
                <CategoryChart categories={summary?.categories ?? []} />
              </div>

              <div className="rounded-2xl border border-bento-gold/10 bg-bento-navy-muted p-6">
                <h2 className="mb-4 font-display text-lg text-bento-offwhite">
                  Resumo
                </h2>
                <ul className="space-y-3">
                  {(summary?.categories ?? []).map((cat) => (
                    <li
                      key={cat.name}
                      className="flex items-center justify-between border-b border-bento-gold/5 pb-3 last:border-0"
                    >
                      <span className="text-bento-offwhite/80">
                        {cat.icon} {cat.name}
                      </span>
                      <span className="font-semibold text-bento-gold">
                        {formatCurrency(cat.total)}
                      </span>
                    </li>
                  ))}
                  {(summary?.categories ?? []).length === 0 && (
                    <li className="text-bento-offwhite/40">Sem dados</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-bento-gold/10 bg-bento-navy-muted p-6">
              <h2 className="mb-4 font-display text-lg text-bento-offwhite">
                Gastos recentes
              </h2>
              <ExpenseList expenses={expenses?.expenses ?? []} />
            </div>

            <div className="mb-6 rounded-2xl border border-bento-gold/10 bg-bento-navy-muted p-6">
              <h2 className="mb-4 font-display text-lg text-bento-offwhite">
                Receitas do período
              </h2>
              <IncomeList income={income?.income ?? []} />
            </div>

            <div className="mb-6">
              <CreditSummary balance={balance} />
            </div>

            <div className="mt-6">
              <SpendingLimitsPanel />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
