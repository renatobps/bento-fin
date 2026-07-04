"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  createExpenseEntry,
  createIncomeEntry,
  fetchCreditCards,
  fetchExpenseCategories,
  fetchIncomeCategories,
  updateExpenseEntry,
  updateIncomeEntry,
  type CategoryItem,
  type ExpenseItem,
  type IncomeItem,
  type SubscriptionInfo,
} from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  TRANSACTION_LABELS,
  todayIsoDate,
  type TransactionKind,
} from "@/lib/transactions";
import type { FinanceTableRow } from "@/components/finance-table";

export interface TransactionFormValues {
  amount: string;
  categoryId: string;
  description: string;
  date: string;
  paymentMethod: string;
  cardName: string;
}

const emptyForm = (): TransactionFormValues => ({
  amount: "",
  categoryId: "",
  description: "",
  date: todayIsoDate(),
  paymentMethod: "dinheiro",
  cardName: "",
});

interface TransactionFormModalProps {
  open: boolean;
  kind: TransactionKind;
  mode: "create" | "edit";
  row?: FinanceTableRow | null;
  subscription?: SubscriptionInfo | null;
  onIncomeLimitReached?: () => void;
  onClose: () => void;
  onSaved: () => void;
}

export function TransactionFormModal({
  open,
  kind,
  mode,
  row,
  subscription,
  onIncomeLimitReached,
  onClose,
  onSaved,
}: TransactionFormModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [cards, setCards] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isIncome = kind === "income";
  const isCredit = kind === "credit_expense";

  const incomeLimit = subscription?.usage.limits.income ?? 10;
  const incomeUsed = subscription?.usage.incomeThisMonth ?? 0;
  const incomeRemaining = Math.max(0, incomeLimit - incomeUsed);
  const isFreePlan = subscription?.plan === "free";
  const incomeLimitReached = isFreePlan && mode === "create" && isIncome && incomeRemaining === 0;

  const loadMeta = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    if (isIncome) {
      setCategories(await fetchIncomeCategories(token));
    } else {
      setCategories(await fetchExpenseCategories(token));
    }

    if (isCredit) {
      const data = await fetchCreditCards(token);
      setCards(data.cards.map((c) => c.name));
    }
  }, [isIncome, isCredit]);

  useEffect(() => {
    if (!open) return;
    setError("");
    loadMeta();

    if (mode === "edit" && row) {
      setForm({
        amount: String(Math.abs(row.amount)),
        categoryId: row.categoryId ? String(row.categoryId) : "",
        description: row.description,
        date: row.date,
        paymentMethod: row.paymentMethod ?? (isCredit ? "credito" : "dinheiro"),
        cardName: row.cardName ?? "",
      });
    } else {
      setForm({
        ...emptyForm(),
        paymentMethod: isCredit ? "credito" : "dinheiro",
      });
    }
  }, [open, mode, row, kind, isCredit, loadMeta]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;

    const amount = parseFloat(form.amount);
    const categoryId = parseInt(form.categoryId, 10);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Informe um valor válido");
      return;
    }
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      setError("Selecione uma categoria");
      return;
    }
    if (!form.date) {
      setError("Informe a data");
      return;
    }
    if (isCredit && !form.cardName.trim()) {
      setError("Selecione o cartão");
      return;
    }

    if (incomeLimitReached) {
      onIncomeLimitReached?.();
      onClose();
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isIncome) {
        const payload = {
          amount,
          categoryId,
          description: form.description.trim() || null,
          incomeDate: form.date,
        };
        if (mode === "edit" && row?.numericId) {
          await updateIncomeEntry(token, row.numericId, payload);
        } else {
          await createIncomeEntry(token, payload);
        }
      } else {
        const payload = {
          amount,
          categoryId,
          description: form.description.trim() || null,
          expenseDate: form.date,
          paymentMethod: isCredit ? "credito" : form.paymentMethod,
          cardName: isCredit ? form.cardName.trim() : null,
        };
        if (mode === "edit" && row?.numericId) {
          await updateExpenseEntry(token, row.numericId, payload);
        } else {
          await createExpenseEntry(token, payload);
        }
      }
      onSaved();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao salvar";
      if (isIncome && message.includes("Limite de") && message.includes("receitas")) {
        onIncomeLimitReached?.();
        onClose();
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const title =
    mode === "edit"
      ? `Editar ${TRANSACTION_LABELS[kind].toLowerCase()}`
      : `Nova ${TRANSACTION_LABELS[kind].toLowerCase()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-2xl border border-bento-gold/20 bg-bento-navy-muted p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-bento-offwhite">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-bento-offwhite/50 transition hover:text-bento-offwhite"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {isIncome && isFreePlan && mode === "create" && (
          <div className="mb-4 rounded-xl border border-bento-gold/20 bg-bento-gold/5 px-4 py-3 text-sm text-bento-offwhite/80">
            Plano gratuito —{" "}
            <span className="font-medium text-bento-gold">
              {incomeRemaining}{" "}
              {incomeRemaining === 1 ? "receita restante" : "receitas restantes"}
            </span>{" "}
            de {incomeLimit} este mês.
            {incomeLimitReached && (
              <>
                {" "}
                <Link href="/planos" className="font-semibold text-bento-gold hover:underline">
                  Ver planos
                </Link>
              </>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-bento-offwhite/70">Valor (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-full rounded-xl border border-bento-gold/20 bg-bento-navy py-2.5 px-4 text-bento-offwhite focus:border-bento-gold/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-bento-offwhite/70">Categoria</label>
            <select
              required
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className="w-full rounded-xl border border-bento-gold/20 bg-bento-navy py-2.5 px-4 text-bento-offwhite focus:border-bento-gold/50 focus:outline-none"
            >
              <option value="">Selecione...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon ? `${cat.icon} ` : ""}
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-bento-offwhite/70">Descrição</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Opcional"
              className="w-full rounded-xl border border-bento-gold/20 bg-bento-navy py-2.5 px-4 text-bento-offwhite placeholder:text-bento-offwhite/30 focus:border-bento-gold/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-bento-offwhite/70">Data</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full rounded-xl border border-bento-gold/20 bg-bento-navy py-2.5 px-4 text-bento-offwhite focus:border-bento-gold/50 focus:outline-none"
            />
          </div>

          {!isIncome && !isCredit && (
            <div>
              <label className="mb-1 block text-sm text-bento-offwhite/70">Pagamento</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                className="w-full rounded-xl border border-bento-gold/20 bg-bento-navy py-2.5 px-4 text-bento-offwhite focus:border-bento-gold/50 focus:outline-none"
              >
                <option value="dinheiro">Dinheiro</option>
                <option value="pix">Pix</option>
                <option value="debito">Débito</option>
              </select>
            </div>
          )}

          {isCredit && (
            <div>
              <label className="mb-1 block text-sm text-bento-offwhite/70">Cartão</label>
              {cards.length === 0 ? (
                <p className="text-sm text-amber-400/90">
                  Cadastre um cartão em Cartões antes de lançar despesas no crédito.
                </p>
              ) : (
                <select
                  required
                  value={form.cardName}
                  onChange={(e) => setForm((f) => ({ ...f, cardName: e.target.value }))}
                  className="w-full rounded-xl border border-bento-gold/20 bg-bento-navy py-2.5 px-4 text-bento-offwhite focus:border-bento-gold/50 focus:outline-none"
                >
                  <option value="">Selecione...</option>
                  {cards.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-bento-gold/20 px-4 py-2.5 text-sm text-bento-offwhite/70 transition hover:border-bento-gold/40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || (isCredit && cards.length === 0) || incomeLimitReached}
              className="flex-1 rounded-xl bg-bento-gold px-4 py-2.5 text-sm font-semibold text-bento-navy transition hover:bg-bento-gold/90 disabled:opacity-50"
            >
              {loading ? "Salvando..." : mode === "edit" ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function rowToEditTarget(row: FinanceTableRow): {
  kind: TransactionKind;
  row: FinanceTableRow;
} | null {
  if (!row.entryType || !row.numericId) return null;
  if (row.entryType === "income") return { kind: "income", row };
  if (row.entryType === "expense") {
    return {
      kind: row.paymentMethod === "credito" ? "credit_expense" : "expense",
      row,
    };
  }
  return null;
}

export function mapIncomeToRow(item: IncomeItem): FinanceTableRow {
  return {
    id: String(item.id),
    entryType: "income",
    numericId: item.id,
    date: item.incomeDate,
    description: item.description ?? item.category,
    category: item.category,
    categoryId: item.categoryId,
    categoryIcon: item.categoryIcon,
    account: "Receita",
    amount: item.amount,
  };
}

export function mapExpenseToRow(
  item: ExpenseItem,
  formatAccount: (paymentMethod?: string, cardName?: string | null) => string
): FinanceTableRow {
  return {
    id: String(item.id),
    entryType: "expense",
    numericId: item.id,
    date: item.expenseDate,
    description: item.description ?? item.category,
    category: item.category,
    categoryId: item.categoryId,
    categoryIcon: item.categoryIcon,
    account: formatAccount(item.paymentMethod, item.cardName),
    amount: item.amount,
    paymentMethod: item.paymentMethod,
    cardName: item.cardName,
  };
}
