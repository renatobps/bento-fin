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
          aria-label="Editar"
          title="Editar"
          className="rounded-lg p-1.5 text-bento-offwhite/60 transition hover:bg-bento-gold/10 hover:text-bento-gold"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zM19.5 7.125L16.875 4.5" />
          </svg>
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(row)}
          aria-label="Excluir"
          title="Excluir"
          className="rounded-lg p-1.5 text-red-400/80 transition hover:bg-red-500/10 hover:text-red-400"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
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
