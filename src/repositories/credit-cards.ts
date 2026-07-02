import { query } from "../db/pool.js";

export interface CreditCard {
  id: number;
  user_id: number;
  name: string;
  credit_limit: string | null;
  created_at: string | Date;
}

export interface CreditDebtByCard {
  card_name: string;
  total: string;
}

export async function upsertCreditCard(
  userId: number,
  name: string,
  creditLimit: number
): Promise<CreditCard> {
  const result = await query<CreditCard>(
    `INSERT INTO credit_cards (user_id, name, credit_limit)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, name)
     DO UPDATE SET credit_limit = EXCLUDED.credit_limit
     RETURNING id, user_id, name, credit_limit, created_at`,
    [userId, name, creditLimit]
  );

  return result.rows[0];
}

export async function getCreditCards(userId: number): Promise<CreditCard[]> {
  const result = await query<CreditCard>(
    `SELECT id, user_id, name, credit_limit, created_at
     FROM credit_cards
     WHERE user_id = $1
     ORDER BY name`,
    [userId]
  );

  return result.rows;
}

export async function getCreditDebtByCard(
  userId: number
): Promise<Array<{ cardName: string; total: number }>> {
  const result = await query<CreditDebtByCard>(
    `SELECT COALESCE(card_name, 'Cartão') AS card_name,
            COALESCE(SUM(amount), 0)::text AS total
     FROM expenses
     WHERE user_id = $1 AND payment_method = 'credito'
     GROUP BY card_name
     ORDER BY SUM(amount) DESC`,
    [userId]
  );

  return result.rows.map((row) => ({
    cardName: row.card_name,
    total: parseFloat(row.total),
  }));
}
