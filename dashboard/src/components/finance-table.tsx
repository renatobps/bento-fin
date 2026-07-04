"use client";

import { formatCurrency, formatExpenseDate } from "@/lib/api";

export interface FinanceTableRow {
  id: string;
  entryType?: "income" | "expense" | "payment";
  numericId?: number;
  date: string;
  description: string;
  category: string;
  categoryId?: number;
  categoryIcon?: string | null;
  account: string;
  amount: number;
  paymentMethod?: string;
  cardName?: string | null;
}

interface FinanceTableProps {
  rows: FinanceTableRow[];
  amountVariant: "income" | "expense" | "mixed";
  emptyMessage: string;
  dailySummary?: (date: string, total: number) => string;
  onEdit?: (row: FinanceTableRow) => void;
  onDelete?: (row: FinanceTableRow) => void;
}

function amountColor(amount: number, variant: FinanceTableProps["amountVariant"]) {
  if (variant === "income") return "text-emerald-400";
  if (variant === "expense") return "text-red-400";
  return amount >= 0 ? "text-emerald-400" : "text-red-400";
}

function groupByDate(rows: FinanceTableRow[]): Array<{ date: string; rows: FinanceTableRow[] }> {
  const map = new Map<string, FinanceTableRow[]>();
  for (const row of rows) {
    const list = map.get(row.date) ?? [];
    list.push(row);
    map.set(row.date, list);
  }
  return Array.from(map.entries()).map(([date, groupRows]) => ({
    date,
    rows: groupRows,
  }));
}

function canModify(row: FinanceTableRow) {
  return row.entryType === "income" || row.entryType === "expense";
}

export function FinanceTable({
  rows,
  amountVariant,
  emptyMessage,
  dailySummary,
  onEdit,
  onDelete,
}: FinanceTableProps) {
  const showActions = Boolean(onEdit || onDelete);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-bento-gold/10 bg-bento-navy-muted px-6 py-16 text-center text-bento-offwhite/40">
        {emptyMessage}
      </div>
    );
  }

  const groups = groupByDate(rows);

  return (
    <div className="overflow-hidden rounded-2xl border border-bento-gold/10 bg-bento-navy-muted">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-bento-gold/10 text-bento-offwhite/50">
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Conta</th>
              <th className="px-4 py-3 text-right font-medium">Valor</th>
              {showActions && (
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              )}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const dayTotal = group.rows.reduce((sum, row) => sum + row.amount, 0);

              return (
                <GroupRows
                  key={group.date}
                  group={group}
                  amountVariant={amountVariant}
                  dayTotal={dayTotal}
                  dailySummary={dailySummary}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  showActions={showActions}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowActions({
  row,
  onEdit,
  onDelete,
}: {
  row: FinanceTableRow;
  onEdit?: (row: FinanceTableRow) => void;
  onDelete?: (row: FinanceTableRow) => void;
}) {
  if (!canModify(row)) return null;

  return (
    <div className="flex justify-end gap-1">
      {onEdit && (
        <button
          type="button"
          onClick={() => onEdit(row)}
          className="rounded-lg px-2 py-1 text-xs text-bento-offwhite/60 transition hover:bg-bento-gold/10 hover:text-bento-gold"
        >
          Editar
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(row)}
          className="rounded-lg px-2 py-1 text-xs text-red-400/80 transition hover:bg-red-500/10 hover:text-red-400"
        >
          Excluir
        </button>
      )}
    </div>
  );
}

function GroupRows({
  group,
  amountVariant,
  dayTotal,
  dailySummary,
  onEdit,
  onDelete,
  showActions,
}: {
  group: { date: string; rows: FinanceTableRow[] };
  amountVariant: FinanceTableProps["amountVariant"];
  dayTotal: number;
  dailySummary?: (date: string, total: number) => string;
  onEdit?: (row: FinanceTableRow) => void;
  onDelete?: (row: FinanceTableRow) => void;
  showActions: boolean;
}) {
  return (
    <>
      {group.rows.map((row) => (
        <tr
          key={row.id}
          className="border-b border-bento-gold/5 transition hover:bg-bento-navy/40"
        >
          <td className="px-4 py-3 text-bento-offwhite/80">
            {formatExpenseDate(row.date)}
          </td>
          <td className="px-4 py-3 text-bento-offwhite">{row.description}</td>
          <td className="px-4 py-3">
            <span className="inline-flex items-center gap-2 text-bento-offwhite/80">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-bento-navy text-sm">
                {row.categoryIcon ?? "📦"}
              </span>
              {row.category}
            </span>
          </td>
          <td className="px-4 py-3 text-bento-offwhite/70">{row.account}</td>
          <td
            className={`px-4 py-3 text-right font-semibold ${amountColor(row.amount, amountVariant)}`}
          >
            {formatCurrency(Math.abs(row.amount))}
          </td>
          {showActions && (
            <td className="px-4 py-3">
              <RowActions row={row} onEdit={onEdit} onDelete={onDelete} />
            </td>
          )}
        </tr>
      ))}
      {dailySummary && (
        <tr>
          <td colSpan={showActions ? 6 : 5} className="px-4 py-3">
            <div className="flex justify-center">
              <span className="rounded-full bg-bento-navy px-4 py-1.5 text-xs text-bento-offwhite/70">
                {dailySummary(group.date, dayTotal)}
              </span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
