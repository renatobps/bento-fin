import { query } from "../db/pool.js";

export interface AccountBalance {
  id: number;
  user_id: number;
  initial_balance: string;
  updated_at: string | Date;
}

export async function getAccountBalance(
  userId: number
): Promise<AccountBalance | null> {
  const result = await query<AccountBalance>(
    `SELECT id, user_id, initial_balance, updated_at
     FROM account_balance
     WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0] ?? null;
}

export async function setInitialBalance(
  userId: number,
  initialBalance: number
): Promise<AccountBalance> {
  const result = await query<AccountBalance>(
    `INSERT INTO account_balance (user_id, initial_balance, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET initial_balance = EXCLUDED.initial_balance, updated_at = NOW()
     RETURNING id, user_id, initial_balance, updated_at`,
    [userId, initialBalance]
  );

  return result.rows[0];
}
