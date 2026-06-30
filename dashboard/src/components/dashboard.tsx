"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatCurrency,
  formatExpenseDateTime,
  PERIOD_LABELS,
  type Period,
  type CategorySummary,
  type ExpenseItem,
} from "@/lib/api";

const CHART_COLORS = [
  "#D4AF37",
  "#B8942E",
  "#E8C547",
  "#9A7B1A",
  "#F5F5F5",
  "#1B263B",
];

interface PeriodFilterProps {
  period: Period;
  onChange: (p: Period) => void;
}

export function PeriodFilter({ period, onChange }: PeriodFilterProps) {
  const periods: Period[] = ["hoje", "semana", "mes"];

  return (
    <div className="flex flex-wrap gap-2">
      {periods.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            period === p
              ? "bg-bento-gold text-bento-navy"
              : "border border-bento-gold/20 bg-bento-navy-muted text-bento-offwhite/70 hover:border-bento-gold/40 hover:text-bento-gold"
          }`}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

interface CategoryChartProps {
  categories: CategorySummary[];
}

export function CategoryChart({ categories }: CategoryChartProps) {
  if (categories.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-bento-offwhite/40">
        Nenhum gasto no período
      </div>
    );
  }

  const data = categories.map((c) => ({
    name: `${c.icon ?? ""} ${c.name}`,
    total: c.total,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          horizontal={false}
          stroke="rgba(212,175,55,0.15)"
        />
        <XAxis
          type="number"
          tickFormatter={(v) => `R$${v}`}
          tick={{ fill: "rgba(245,245,245,0.5)", fontSize: 12 }}
          axisLine={{ stroke: "rgba(212,175,55,0.2)" }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fill: "rgba(245,245,245,0.7)", fontSize: 12 }}
          axisLine={{ stroke: "rgba(212,175,55,0.2)" }}
        />
        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
        <Bar dataKey="total" radius={[0, 6, 6, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface ExpenseListProps {
  expenses: ExpenseItem[];
}

export function ExpenseList({ expenses }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <p className="py-8 text-center text-bento-offwhite/40">
        Nenhum gasto registrado neste período
      </p>
    );
  }

  return (
    <ul className="divide-y divide-bento-gold/10">
      {expenses.map((expense) => (
        <li
          key={expense.id}
          className="flex items-center justify-between py-4"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{expense.categoryIcon ?? "📦"}</span>
            <div>
              <p className="font-medium text-bento-offwhite">
                {expense.description ?? expense.category}
              </p>
              <p className="text-sm text-bento-offwhite/50">
                {expense.category} ·{" "}
                {formatExpenseDateTime(expense.expenseDate, expense.createdAt)}
              </p>
            </div>
          </div>
          <span className="font-semibold text-bento-gold">
            {formatCurrency(expense.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}
