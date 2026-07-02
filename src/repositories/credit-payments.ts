import { query } from "../db/pool.js";

export interface CreditPayment {
  id: number;
  user_id: number;
  amount: string;
  card_name: string | null;
  payment_date: string;
  source: string;
  created_at?: string | Date;
}

export async function createCreditPayment(params: {
  userId: number;
  amount: number;
  cardName: string | null;
  paymentDate: string;
  source?: string;
}): Promise<CreditPayment> {
  const result = await query<CreditPayment>(
    `INSERT INTO credit_payments (user_id, amount, card_name, payment_date, source)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, amount, card_name, payment_date, source`,
    [
      params.userId,
      params.amount,
      params.cardName,
      params.paymentDate,
      params.source ?? "text",
    ]
  );

  return result.rows[0];
}

export async function getTotalCreditPayments(userId: number): Promise<number> {
  const result = await query<{ total: string | null }>(
    `SELECT COALESCE(SUM(amount), 0)::text AS total
     FROM credit_payments
     WHERE user_id = $1`,
    [userId]
  );

  return parseFloat(result.rows[0]?.total ?? "0");
}
