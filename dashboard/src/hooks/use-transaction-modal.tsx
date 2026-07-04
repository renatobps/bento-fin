"use client";

import { useCallback, useState } from "react";
import { deleteExpenseEntry, deleteIncomeEntry } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { TransactionKind } from "@/lib/transactions";
import type { FinanceTableRow } from "@/components/finance-table";
import {
  rowToEditTarget,
  TransactionFormModal,
} from "@/components/transaction-form-modal";

export function useTransactionModal(onSaved: () => void) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<TransactionKind>("expense");
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editRow, setEditRow] = useState<FinanceTableRow | null>(null);

  const openCreate = useCallback((nextKind: TransactionKind) => {
    setKind(nextKind);
    setMode("create");
    setEditRow(null);
    setOpen(true);
  }, []);

  const openEdit = useCallback((row: FinanceTableRow) => {
    const target = rowToEditTarget(row);
    if (!target) return;
    setKind(target.kind);
    setMode("edit");
    setEditRow(target.row);
    setOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (row: FinanceTableRow) => {
      if (!row.entryType || !row.numericId) return;
      const label = row.entryType === "income" ? "receita" : "despesa";
      if (!confirm(`Excluir esta ${label}?`)) return;

      const token = getToken();
      if (!token) return;

      try {
        if (row.entryType === "income") {
          await deleteIncomeEntry(token, row.numericId);
        } else if (row.entryType === "expense") {
          await deleteExpenseEntry(token, row.numericId);
        } else {
          return;
        }
        onSaved();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Erro ao excluir");
      }
    },
    [onSaved]
  );

  const modal = (
    <TransactionFormModal
      open={open}
      kind={kind}
      mode={mode}
      row={editRow}
      onClose={() => setOpen(false)}
      onSaved={onSaved}
    />
  );

  return { openCreate, openEdit, handleDelete, modal };
}
