import { query } from "../db/pool.js";
import type { IntentSource } from "../types/parsed-message.js";

export async function logMessage(params: {
  userId: number;
  rawMessage: string;
  messageType: string;
  processedSuccessfully: boolean;
  inputTokens?: number;
  outputTokens?: number;
  detectedIntent?: string;
  intentSource?: IntentSource;
}): Promise<void> {
  await query(
    `INSERT INTO messages_log (
       user_id, raw_message, message_type, processed_successfully,
       input_tokens, output_tokens, detected_intent, intent_source
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      params.userId,
      params.rawMessage,
      params.messageType,
      params.processedSuccessfully,
      params.inputTokens ?? null,
      params.outputTokens ?? null,
      params.detectedIntent ?? null,
      params.intentSource ?? null,
    ]
  );
}
