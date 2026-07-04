import { query } from "../db/pool.js";

const DEDUP_KEY_MAX_LEN = 100;

/** Retorna true na primeira vez que a mensagem é vista (deve processar). */
export async function shouldProcessMessage(
  phone: string,
  messageId: string
): Promise<boolean> {
  const key = `${phone}:${messageId}`.slice(0, DEDUP_KEY_MAX_LEN);

  const result = await query(
    `INSERT INTO message_dedup (message_key) VALUES ($1) ON CONFLICT DO NOTHING`,
    [key]
  );

  cleanupOldDedupEntries().catch((err) => {
    console.error("Erro ao limpar dedup antigo:", err);
  });

  return result.rowCount === 1;
}

export async function cleanupOldDedupEntries(): Promise<void> {
  await query(
    `DELETE FROM message_dedup WHERE created_at < NOW() - INTERVAL '24 hours'`
  );
}
