"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { formatCurrency, type BalanceSummary } from "@/lib/api";

interface SummaryStatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  iconBg: string;
  href: string;
}

function SummaryStatCard({
  label,
  value,
  icon,
  iconBg,
  href,
}: SummaryStatCardProps) {
  return (
    <Link
      href={href}
      className="flex w-full items-center gap-3 rounded-2xl border border-bento-gold/10 bg-bento-navy-muted p-4 text-left transition hover:border-bento-gold/25 hover:bg-bento-navy-muted/80"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconBg}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-bento-offwhite/55">{label}</p>
        <p className="truncate font-semibold text-bento-offwhite">{value}</p>
      </div>
      <svg
        className="h-5 w-5 shrink-0 text-bento-offwhite/30"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

function BankIcon() {
  return (
    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M5 10V18M9 10V18M15 10V18M19 10V18M4 6h16" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h2M11 15h6M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
    </svg>
  );
}

interface FinanceOverviewCardsProps {
  balance: BalanceSummary | null;
  incomeTotal: number;
  expensesTotal: number;
}

export function FinanceOverviewCards({
  balance,
  incomeTotal,
  expensesTotal,
}: FinanceOverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryStatCard
        label="Saldo atual"
        value={formatCurrency(balance?.availableBalance ?? 0)}
        icon={<BankIcon />}
        iconBg="bg-blue-500"
        href="/dashboard/saldo"
      />
      <SummaryStatCard
        label="Receitas"
        value={formatCurrency(incomeTotal)}
        icon={<ArrowUpIcon />}
        iconBg="bg-emerald-500"
        href="/dashboard/transacoes?tipo=entrada"
      />
      <SummaryStatCard
        label="Despesas"
        value={formatCurrency(expensesTotal)}
        icon={<ArrowDownIcon />}
        iconBg="bg-red-500"
        href="/dashboard/transacoes?tipo=saida"
      />
      <SummaryStatCard
        label="Cartão de crédito"
        value={formatCurrency(balance?.totalCreditDebt ?? 0)}
        icon={<CreditCardIcon />}
        iconBg="bg-teal-500"
        href="/dashboard/cartoes"
      />
    </div>
  );
}
