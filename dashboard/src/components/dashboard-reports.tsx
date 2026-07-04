"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/api";
import type { CategoryTotal } from "@/lib/aggregations";

const EXPENSE_COLORS = ["#f87171", "#fb923c", "#fbbf24", "#a78bfa", "#60a5fa", "#34d399"];
const INCOME_COLORS = ["#34d399", "#2dd4bf", "#4ade80", "#86efac", "#a7f3d0", "#6ee7b7"];

interface ReportCardProps {
  title: string;
  children: React.ReactNode;
}

function ReportCard({ title, children }: ReportCardProps) {
  return (
    <div className="rounded-2xl border border-bento-gold/10 bg-bento-navy-muted p-5">
      <h2 className="mb-4 font-display text-base text-bento-offwhite">{title}</h2>
      {children}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-56 items-center justify-center text-sm text-bento-offwhite/40">
      {message}
    </div>
  );
}

interface MonthlyBalanceChartProps {
  incomeTotal: number;
  expensesTotal: number;
}

export function MonthlyBalanceChart({
  incomeTotal,
  expensesTotal,
}: MonthlyBalanceChartProps) {
  if (incomeTotal === 0 && expensesTotal === 0) {
    return <EmptyChart message="Sem movimentação neste mês" />;
  }

  const data = [
    { name: "Receitas", value: incomeTotal, fill: "#34d399" },
    { name: "Despesas", value: expensesTotal, fill: "#f87171" },
  ];

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,175,55,0.12)" />
        <XAxis
          dataKey="name"
          tick={{ fill: "rgba(245,245,245,0.7)", fontSize: 12 }}
          axisLine={{ stroke: "rgba(212,175,55,0.2)" }}
        />
        <YAxis
          tickFormatter={(v) => `R$${v}`}
          tick={{ fill: "rgba(245,245,245,0.5)", fontSize: 11 }}
          axisLine={{ stroke: "rgba(212,175,55,0.2)" }}
        />
        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface CategoryBreakdownChartProps {
  categories: CategoryTotal[];
  emptyMessage: string;
  colors: string[];
}

function CategoryBreakdownChart({
  categories,
  emptyMessage,
  colors,
}: CategoryBreakdownChartProps) {
  if (categories.length === 0) {
    return <EmptyChart message={emptyMessage} />;
  }

  const data = categories.map((c) => ({
    name: `${c.icon ?? ""} ${c.name}`.trim(),
    total: c.total,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, categories.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          horizontal={false}
          stroke="rgba(212,175,55,0.12)"
        />
        <XAxis
          type="number"
          tickFormatter={(v) => `R$${v}`}
          tick={{ fill: "rgba(245,245,245,0.5)", fontSize: 11 }}
          axisLine={{ stroke: "rgba(212,175,55,0.2)" }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tick={{ fill: "rgba(245,245,245,0.7)", fontSize: 11 }}
          axisLine={{ stroke: "rgba(212,175,55,0.2)" }}
        />
        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
        <Bar dataKey="total" radius={[0, 6, 6, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface ExpensesByCategoryChartProps {
  categories: CategoryTotal[];
}

export function ExpensesByCategoryChart({ categories }: ExpensesByCategoryChartProps) {
  return (
    <CategoryBreakdownChart
      categories={categories}
      emptyMessage="Nenhuma despesa neste mês"
      colors={EXPENSE_COLORS}
    />
  );
}

interface IncomeByCategoryChartProps {
  categories: CategoryTotal[];
}

export function IncomeByCategoryChart({ categories }: IncomeByCategoryChartProps) {
  return (
    <CategoryBreakdownChart
      categories={categories}
      emptyMessage="Nenhuma receita neste mês"
      colors={INCOME_COLORS}
    />
  );
}

export interface CreditCardUsage {
  name: string;
  limit: number | null;
  used: number;
}

interface CreditLimitChartProps {
  cards: CreditCardUsage[];
}

export function CreditLimitChart({ cards }: CreditLimitChartProps) {
  if (cards.length === 0) {
    return <EmptyChart message="Nenhum cartão cadastrado" />;
  }

  const data = cards.map((card) => ({
    name: card.name,
    limite: card.limit ?? 0,
    usado: card.used,
    hasLimit: card.limit !== null && card.limit > 0,
  }));

  const hasAnyLimit = data.some((c) => c.hasLimit);

  if (!hasAnyLimit && data.every((c) => c.usado === 0)) {
    return <EmptyChart message="Defina o limite dos cartões para ver o relatório" />;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, cards.length * 52)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          horizontal={false}
          stroke="rgba(212,175,55,0.12)"
        />
        <XAxis
          type="number"
          tickFormatter={(v) => `R$${v}`}
          tick={{ fill: "rgba(245,245,245,0.5)", fontSize: 11 }}
          axisLine={{ stroke: "rgba(212,175,55,0.2)" }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          tick={{ fill: "rgba(245,245,245,0.7)", fontSize: 11 }}
          axisLine={{ stroke: "rgba(212,175,55,0.2)" }}
        />
        <Tooltip
          formatter={(value, name) => [
            formatCurrency(Number(value)),
            name === "limite" ? "Limite atual" : "Limite usado",
          ]}
        />
        <Legend
          formatter={(value) => (value === "limite" ? "Limite atual" : "Limite usado")}
          wrapperStyle={{ color: "rgba(245,245,245,0.6)", fontSize: 12 }}
        />
        {hasAnyLimit && (
          <Bar dataKey="limite" fill="rgba(45,212,191,0.55)" radius={[0, 4, 4, 0]} />
        )}
        <Bar dataKey="usado" fill="#f87171" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface DashboardReportsProps {
  incomeTotal: number;
  expensesTotal: number;
  expenseCategories: CategoryTotal[];
  incomeCategories: CategoryTotal[];
  creditCards: CreditCardUsage[];
}

export function DashboardReports({
  incomeTotal,
  expensesTotal,
  expenseCategories,
  incomeCategories,
  creditCards,
}: DashboardReportsProps) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ReportCard title="Balanço mensal (Receita × Despesa)">
        <MonthlyBalanceChart incomeTotal={incomeTotal} expensesTotal={expensesTotal} />
      </ReportCard>

      <ReportCard title="Despesas por categoria">
        <ExpensesByCategoryChart categories={expenseCategories} />
      </ReportCard>

      <ReportCard title="Receitas por categoria">
        <IncomeByCategoryChart categories={incomeCategories} />
      </ReportCard>

      <ReportCard title="Cartão de crédito (Limite atual × Limite usado)">
        <CreditLimitChart cards={creditCards} />
      </ReportCard>
    </div>
  );
}
