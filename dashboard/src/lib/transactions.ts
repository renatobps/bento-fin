export type TransactionKind = "income" | "expense" | "credit_expense";

export function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const TRANSACTION_LABELS: Record<TransactionKind, string> = {
  income: "Receita",
  expense: "Despesa",
  credit_expense: "Despesa cartão",
};
