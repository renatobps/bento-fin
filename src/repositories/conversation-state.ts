import { query } from "../db/pool.js";

export interface PendingContext {
  awaiting_value?: boolean;
  partial_description?: string;
  partial_category?: string;
  partial_expense_date?: string;
}

export async function getPendingContext(
  userId: number
): Promise<PendingContext | null> {
  const result = await query<{ pending_context: PendingContext | null }>(
    "SELECT pending_context FROM conversation_state WHERE user_id = $1",
    [userId]
  );

  return result.rows[0]?.pending_context ?? null;
}

export async function setPendingContext(
  userId: number,
  context: PendingContext | null
): Promise<void> {
  if (context === null) {
    await query("DELETE FROM conversation_state WHERE user_id = $1", [userId]);
    return;
  }

  await query(
    `INSERT INTO conversation_state (user_id, pending_context, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET pending_context = $2, updated_at = NOW()`,
    [userId, JSON.stringify(context)]
  );
}
