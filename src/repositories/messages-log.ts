import { query } from "../db/pool.js";

export async function logMessage(params: {
  userId: number;
  rawMessage: string;
  messageType: string;
  processedSuccessfully: boolean;
}): Promise<void> {
  await query(
    `INSERT INTO messages_log (user_id, raw_message, message_type, processed_successfully)
     VALUES ($1, $2, $3, $4)`,
    [
      params.userId,
      params.rawMessage,
      params.messageType,
      params.processedSuccessfully,
    ]
  );
}
