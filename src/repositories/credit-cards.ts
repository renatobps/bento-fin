import { query } from "../db/pool.js";

export interface CreditCard {
  id: number;
  user_id: number;
  name: string;
  credit_limit: string | null;
  billing_due_day: number | null;
  created_at: string | Date;
}

export interface CreditDebtByCard {
  card_name: string;
  total: string;
}

export interface CreditCardUpdates {
  creditLimit?: number | null;
  billingDueDay?: number | null;
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
     RETURNING id, user_id, name, credit_limit, billing_due_day, created_at`,
    [userId, name.trim(), creditLimit]
  );

  return result.rows[0];
}

export async function createCreditCard(
  userId: number,
  name: string,
  creditLimit: number | null,
  billingDueDay: number | null
): Promise<CreditCard> {
  const result = await query<CreditCard>(
    `INSERT INTO credit_cards (user_id, name, credit_limit, billing_due_day)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, name, credit_limit, billing_due_day, created_at`,
    [userId, name.trim(), creditLimit, billingDueDay]
  );

  return result.rows[0];
}

export async function findCreditCardByName(
  userId: number,
  name: string
): Promise<CreditCard | null> {
  const result = await query<CreditCard>(
    `SELECT id, user_id, name, credit_limit, billing_due_day, created_at
     FROM credit_cards
     WHERE user_id = $1 AND LOWER(name) = LOWER($2)`,
    [userId, name.trim()]
  );

  return result.rows[0] ?? null;
}

export async function updateCreditCardById(
  userId: number,
  cardId: number,
  updates: CreditCardUpdates
): Promise<CreditCard | null> {
  const sets: string[] = [];
  const values: unknown[] = [cardId, userId];

  if (updates.creditLimit !== undefined) {
    values.push(updates.creditLimit);
    sets.push(`credit_limit = $${values.length}`);
  }

  if (updates.billingDueDay !== undefined) {
    values.push(updates.billingDueDay);
    sets.push(`billing_due_day = $${values.length}`);
  }

  if (sets.length === 0) {
    return null;
  }

  const result = await query<CreditCard>(
    `UPDATE credit_cards
     SET ${sets.join(", ")}
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, name, credit_limit, billing_due_day, created_at`,
    values
  );

  return result.rows[0] ?? null;
}

export async function updateCreditCardLimitById(
  userId: number,
  cardId: number,
  creditLimit: number
): Promise<CreditCard | null> {
  return updateCreditCardById(userId, cardId, { creditLimit });
}

export async function updateCreditCardLimit(
  userId: number,
  cardName: string,
  creditLimit: number
): Promise<{ card: CreditCard; created: boolean }> {
  const existing = await findCreditCardByName(userId, cardName);
  const name = existing?.name ?? cardName.trim();
  const card = await upsertCreditCard(userId, name, creditLimit);
  return { card, created: !existing };
}

export async function getCreditCards(userId: number): Promise<CreditCard[]> {
  const result = await query<CreditCard>(
    `SELECT id, user_id, name, credit_limit, billing_due_day, created_at
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

