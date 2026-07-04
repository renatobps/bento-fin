"use client";

import Link from "next/link";
import type { SubscriptionInfo } from "@/lib/api";

interface PlanBannerProps {
  subscription: SubscriptionInfo | null;
}

export function PlanBanner({ subscription }: PlanBannerProps) {
  if (!subscription || subscription.plan !== "free") return null;

  const expenseLimit = subscription.usage.limits.expenses ?? 30;
  const expenseUsed = subscription.usage.expensesThisMonth;
  const expensesRemaining = Math.max(0, expenseLimit - expenseUsed);

  const incomeLimit = subscription.usage.limits.income ?? 10;
  const incomeUsed = subscription.usage.incomeThisMonth;
  const incomeRemaining = Math.max(0, incomeLimit - incomeUsed);

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-bento-gold/20 bg-bento-gold/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-bento-offwhite/80">
        Você está no plano gratuito —{" "}
        <span className="font-medium text-bento-gold">
          {expensesRemaining}{" "}
          {expensesRemaining === 1 ? "gasto restante" : "gastos restantes"}
        </span>{" "}
        e{" "}
        <span className="font-medium text-bento-gold">
          {incomeRemaining}{" "}
          {incomeRemaining === 1 ? "receita restante" : "receitas restantes"}
        </span>{" "}
        este mês.
      </p>
      <Link
        href="/planos"
        className="shrink-0 rounded-lg bg-bento-gold px-4 py-2 text-center text-sm font-semibold text-bento-navy transition hover:bg-bento-gold-dark"
      >
        Fazer upgrade
      </Link>
    </div>
  );
}
