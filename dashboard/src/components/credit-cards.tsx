"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createCreditCard,
  fetchCreditCards,
  formatCurrency,
  updateCreditCard,
  type CreditCardItem,
} from "@/lib/api";
import { getToken } from "@/lib/auth";

interface CardFormState {
  limit: string;
  dueDay: string;
}

const emptyNewCard = { name: "", limit: "", dueDay: "" };

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = parseFloat(trimmed);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function parseDueDay(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = parseInt(trimmed, 10);
  return Number.isFinite(num) && num >= 1 && num <= 31 ? num : null;
}

export function CreditCardsPanel() {
  const [cards, setCards] = useState<CreditCardItem[]>([]);
  const [forms, setForms] = useState<Record<number, CardFormState>>({});
  const [newCard, setNewCard] = useState(emptyNewCard);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | "new" | null>(null);
  const [error, setError] = useState("");
  const [successId, setSuccessId] = useState<number | "new" | null>(null);

  const loadCards = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    setError("");
    try {
      const data = await fetchCreditCards(token);
      setCards(data.cards);
      const initial: Record<number, CardFormState> = {};
      for (const card of data.cards) {
        initial[card.id] = {
          limit: card.creditLimit !== null ? String(card.creditLimit) : "",
          dueDay: card.billingDueDay !== null ? String(card.billingDueDay) : "",
        };
      }
      setForms(initial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar cartões");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  async function handleCreate() {
    const token = getToken();
    if (!token) return;

    const name = newCard.name.trim();
    if (!name) {
      setError("Informe o nome do cartão");
      return;
    }

    const creditLimit = parseOptionalNumber(newCard.limit);
    if (newCard.limit.trim() && creditLimit === null) {
      setError("Limite inválido");
      return;
    }

    const billingDueDay = parseDueDay(newCard.dueDay);
    if (newCard.dueDay.trim() && billingDueDay === null) {
      setError("Dia de vencimento inválido (use 1 a 31)");
      return;
    }

    setSavingId("new");
    setError("");
    setSuccessId(null);
    try {
      await createCreditCard(token, {
        name,
        creditLimit,
        billingDueDay,
      });
      setNewCard(emptyNewCard);
      await loadCards();
      setSuccessId("new");
      setTimeout(() => setSuccessId(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar cartão");
    } finally {
      setSavingId(null);
    }
  }

  async function handleSave(card: CreditCardItem) {
    const token = getToken();
    if (!token) return;

    const form = forms[card.id];
    if (!form) return;

    const creditLimit = parseOptionalNumber(form.limit);
    if (form.limit.trim() && creditLimit === null) {
      setError("Limite inválido");
      return;
    }

    const billingDueDay = parseDueDay(form.dueDay);
    if (form.dueDay.trim() && billingDueDay === null) {
      setError("Dia de vencimento inválido (use 1 a 31)");
      return;
    }

    setSavingId(card.id);
    setError("");
    setSuccessId(null);
    try {
      const updated = await updateCreditCard(token, card.id, {
        creditLimit,
        billingDueDay,
      });
      setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setForms((prev) => ({
        ...prev,
        [card.id]: {
          limit: updated.creditLimit !== null ? String(updated.creditLimit) : "",
          dueDay: updated.billingDueDay !== null ? String(updated.billingDueDay) : "",
        },
      }));
      setSuccessId(card.id);
      setTimeout(() => setSuccessId(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar cartão");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-bento-gold/10 bg-bento-navy-muted p-6">
        <p className="text-bento-offwhite/40">Carregando cartões...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-bento-gold/10 bg-bento-navy-muted p-6">
        <h2 className="mb-1 font-display text-lg text-bento-offwhite">
          Adicionar cartão
        </h2>
        <p className="mb-4 text-sm text-bento-offwhite/50">
          Cadastre um novo cartão com limite e dia de vencimento da fatura.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label className="mb-1 block text-sm text-bento-offwhite/70">
              Nome do cartão
            </label>
            <input
              type="text"
              maxLength={50}
              placeholder="Ex: Nubank, Inter..."
              value={newCard.name}
              onChange={(e) =>
                setNewCard((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full rounded-xl border border-bento-gold/20 bg-bento-navy py-2.5 px-4 text-bento-offwhite placeholder:text-bento-offwhite/30 focus:border-bento-gold/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-bento-offwhite/70">
              Limite (R$)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex: 5000"
              value={newCard.limit}
              onChange={(e) =>
                setNewCard((prev) => ({ ...prev, limit: e.target.value }))
              }
              className="w-full rounded-xl border border-bento-gold/20 bg-bento-navy py-2.5 px-4 text-bento-offwhite placeholder:text-bento-offwhite/30 focus:border-bento-gold/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-bento-offwhite/70">
              Vencimento da fatura
            </label>
            <input
              type="number"
              min="1"
              max="31"
              placeholder="Dia do mês (1-31)"
              value={newCard.dueDay}
              onChange={(e) =>
                setNewCard((prev) => ({ ...prev, dueDay: e.target.value }))
              }
              className="w-full rounded-xl border border-bento-gold/20 bg-bento-navy py-2.5 px-4 text-bento-offwhite placeholder:text-bento-offwhite/30 focus:border-bento-gold/50 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleCreate}
              disabled={savingId === "new"}
              className="w-full rounded-xl bg-bento-gold px-4 py-2.5 text-sm font-semibold text-bento-navy transition hover:bg-bento-gold/90 disabled:opacity-50"
            >
              {savingId === "new"
                ? "Adicionando..."
                : successId === "new"
                  ? "Adicionado!"
                  : "Adicionar cartão"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-bento-gold/10 bg-bento-navy-muted p-6">
        <h2 className="mb-1 font-display text-lg text-bento-offwhite">
          Meus cartões
        </h2>
        <p className="mb-4 text-sm text-bento-offwhite/50">
          Edite o limite e o vencimento de cada cartão cadastrado.
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {cards.length === 0 ? (
          <p className="text-bento-offwhite/40">
            Nenhum cartão cadastrado ainda.
          </p>
        ) : (
          <ul className="space-y-4">
            {cards.map((card) => (
              <li
                key={card.id}
                className="rounded-xl border border-bento-gold/10 bg-bento-navy/50 p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-bento-offwhite">{card.name}</p>
                  {card.creditLimit !== null && (
                    <p className="text-xs text-bento-offwhite/50">
                      Limite atual: {formatCurrency(card.creditLimit)}
                    </p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs text-bento-offwhite/60">
                      Limite (R$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Limite"
                      value={forms[card.id]?.limit ?? ""}
                      onChange={(e) =>
                        setForms((prev) => ({
                          ...prev,
                          [card.id]: {
                            ...prev[card.id],
                            limit: e.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-bento-gold/20 bg-bento-navy py-2.5 px-4 text-bento-offwhite placeholder:text-bento-offwhite/30 focus:border-bento-gold/50 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-bento-offwhite/60">
                      Vencimento (dia)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="1-31"
                      value={forms[card.id]?.dueDay ?? ""}
                      onChange={(e) =>
                        setForms((prev) => ({
                          ...prev,
                          [card.id]: {
                            ...prev[card.id],
                            dueDay: e.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-bento-gold/20 bg-bento-navy py-2.5 px-4 text-bento-offwhite placeholder:text-bento-offwhite/30 focus:border-bento-gold/50 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => handleSave(card)}
                      disabled={savingId === card.id}
                      className="w-full rounded-xl border border-bento-gold/30 px-4 py-2.5 text-sm font-medium text-bento-gold transition hover:bg-bento-gold/10 disabled:opacity-50"
                    >
                      {savingId === card.id
                        ? "Salvando..."
                        : successId === card.id
                          ? "Salvo!"
                          : "Salvar"}
                    </button>
                  </div>
                </div>

                {card.billingDueDay !== null && (
                  <p className="mt-2 text-xs text-bento-offwhite/45">
                    Fatura vence todo dia {card.billingDueDay}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
