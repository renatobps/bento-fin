import { query } from "../db/pool.js";
import { getCreditDebtByCard } from "../repositories/credit-cards.js";
import { formatCurrency } from "../utils/format.js";

export interface BalanceSummary {
  initialBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalCreditPayments: number;
  availableBalance: number;
  totalCreditDebt: number;
  creditByCard: Array<{ cardName: string; total: number }>;
}

export async function calculateBalance(userId: number): Promise<BalanceSummary> {
  const result = await query<{
    initial_balance: string;
    total_income: string;
    total_expenses: string;
    total_credit_payments: string;
    total_credit_debt: string;
  }>(
    `SELECT
       COALESCE((SELECT initial_balance FROM account_balance WHERE user_id = $1), 0)::text AS initial_balance,
       COALESCE((SELECT SUM(i.amount) FROM income i WHERE i.user_id = $1), 0)::text AS total_income,
       COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.user_id = $1 AND e.payment_method IN ('dinheiro', 'pix', 'debito')), 0)::text AS total_expenses,
       COALESCE((SELECT SUM(cp.amount) FROM credit_payments cp WHERE cp.user_id = $1), 0)::text AS total_credit_payments,
       COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.user_id = $1 AND e.payment_method = 'credito'), 0)::text AS total_credit_debt`,
    [userId]
  );

  const row = result.rows[0];
  const initialBalance = parseFloat(row.initial_balance);
  const totalIncome = parseFloat(row.total_income);
  const totalExpenses = parseFloat(row.total_expenses);
  const totalCreditPayments = parseFloat(row.total_credit_payments);
  const totalCreditDebt = parseFloat(row.total_credit_debt);

  const creditByCard = await getCreditDebtByCard(userId);

  const availableBalance =
    initialBalance + totalIncome - totalExpenses - totalCreditPayments;

  return {
    initialBalance,
    totalIncome,
    totalExpenses,
    totalCreditPayments,
    availableBalance,
    totalCreditDebt,
    creditByCard,
  };
}

export async function getCreditDebtByCardSummary(
  userId: number
): Promise<Array<{ cardName: string; total: number }>> {
  return getCreditDebtByCard(userId);
}

export function formatBalanceSummary(summary: BalanceSummary): string {
  return `💰 Saldo disponível: ${formatCurrency(summary.availableBalance)}

Saldo inicial: ${formatCurrency(summary.initialBalance)}
Receitas: ${formatCurrency(summary.totalIncome)}
Gastos (débito/pix/dinheiro): ${formatCurrency(summary.totalExpenses)}
Faturas pagas: ${formatCurrency(summary.totalCreditPayments)}`;
}

export async function formatCreditSummary(userId: number): Promise<string> {
  const creditByCard = await getCreditDebtByCard(userId);
  const total = creditByCard.reduce((sum, card) => sum + card.total, 0);

  if (total <= 0) {
    return "💳 Você não tem dívidas no crédito no momento.";
  }

  const lines = creditByCard.map(
    (card) => `${card.cardName}: ${formatCurrency(card.total)}`
  );

  return `💳 Dívida no crédito: ${formatCurrency(total)}

${lines.join("\n")}`;
}
