import { query } from "../db/pool.js";

export interface PendingContext {
  awaiting_value?: boolean;
  partial_description?: string;
  partial_category?: string;
  partial_expense_date?: string;
  awaiting_initial_balance?: boolean;
  awaiting_credit_card?: boolean;
  awaiting_card_limit?: boolean;
  awaiting_more_cards?: boolean;
}

export async function getPendingContext(
  userId: number
): Promise<PendingContext | null> {
  const result = await query<{ pending_context: PendingContext | null }>(
    `SELECT pending_context FROM conversation_state
     WHERE user_id = $1
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [userId]
  );

  const context = result.rows[0]?.pending_context ?? null;

  if (!context && result.rowCount === 0) {
    await query(
      `DELETE FROM conversation_state
       WHERE user_id = $1
         AND expires_at IS NOT NULL
         AND expires_at <= NOW()`,
      [userId]
    );
  }

  return context;
}

export async function setPendingContext(
  userId: number,
  context: PendingContext | null
): Promise<void> {
  if (context === null) {
    await query("DELETE FROM conversation_state WHERE user_id = $1", [userId]);
    return;
  }

  const isOnboarding =
    context.awaiting_initial_balance ||
    context.awaiting_credit_card ||
    context.awaiting_card_limit ||
    context.awaiting_more_cards;

  const expiryInterval = isOnboarding ? "24 hours" : "10 minutes";

  await query(
    `INSERT INTO conversation_state (user_id, pending_context, expires_at, updated_at)
     VALUES ($1, $2, NOW() + INTERVAL '${expiryInterval}', NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       pending_context = $2,
       expires_at = NOW() + INTERVAL '${expiryInterval}',
       updated_at = NOW()`,
    [userId, JSON.stringify(context)]
  );
}

export async function clearExpiredContexts(): Promise<void> {
  await query(
    `DELETE FROM conversation_state
     WHERE expires_at IS NOT NULL AND expires_at < NOW()`
  );
}
