import { query } from "../db/pool.js";
import { sendWhatsAppText } from "./evolution.js";
import { formatCurrency } from "../utils/format.js";
import { getDisplayFirstName, personalizeMessage } from "../utils/user-display.js";

export interface UpcomingBillingUser {
  userId: number;
  phone: string;
  userName: string | null;
  cardName: string;
  dueDay: number;
  debtTotal: number;
}

export async function getUsersWithUpcomingBilling(
  daysAhead: number
): Promise<UpcomingBillingUser[]> {
  const result = await query<{
    user_id: number;
    phone: string;
    user_name: string | null;
    card_name: string;
    due_day: number;
    debt_total: string;
  }>(
    `SELECT u.id AS user_id,
            u.phone,
            u.name AS user_name,
            cc.name AS card_name,
            cc.billing_due_day AS due_day,
            COALESCE(SUM(e.amount), 0)::text AS debt_total
     FROM credit_cards cc
     JOIN users u ON u.id = cc.user_id
     LEFT JOIN expenses e
       ON e.user_id = cc.user_id
      AND e.payment_method = 'credito'
      AND LOWER(COALESCE(e.card_name, 'cartão')) = LOWER(cc.name)
     WHERE cc.billing_due_day IS NOT NULL
       AND cc.billing_due_day = EXTRACT(
         DAY FROM (
           (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date
           + $1::int * INTERVAL '1 day'
         )
       )::int
     GROUP BY u.id, u.phone, u.name, cc.name, cc.billing_due_day
     HAVING COALESCE(SUM(e.amount), 0) > 0`,
    [daysAhead]
  );

  return result.rows.map((row) => ({
    userId: row.user_id,
    phone: row.phone,
    userName: row.user_name,
    cardName: row.card_name,
    dueDay: row.due_day,
    debtTotal: parseFloat(row.debt_total),
  }));
}

export async function sendBillingReminders(): Promise<void> {
  const upcoming = await getUsersWithUpcomingBilling(3);

  for (const item of upcoming) {
    const text = personalizeMessage(
      item.userName,
      `💳 Lembrete: a fatura do seu ${item.cardName} vence em 3 dias.\n` +
        `Valor aproximado em aberto: ${formatCurrency(item.debtTotal)}\n\n` +
        `Pague com: "paguei a fatura do ${item.cardName} de X reais"`
    );

    await sendWhatsAppText({ phone: item.phone, text });
    console.log(
      `Lembrete de fatura enviado: user=${item.userId} cartão=${item.cardName} dívida=${formatCurrency(item.debtTotal)}`
    );
  }
}
