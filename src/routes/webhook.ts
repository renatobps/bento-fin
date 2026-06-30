import { Router, Request, Response } from "express";
import type {
  EvolutionMessageData,
  EvolutionWebhookPayload,
} from "../types/evolution.js";
import { extractPhoneFromJid } from "../utils/format.js";
import { enqueueForUser } from "../services/user-queue.js";
import { processMessage } from "../services/message-processor.js";

function extractText(data: EvolutionMessageData): string | null {
  if (data.message?.conversation) {
    return data.message.conversation;
  }
  if (data.message?.extendedTextMessage?.text) {
    return data.message.extendedTextMessage.text;
  }
  return null;
}

function isProcessableMessage(data: EvolutionMessageData): boolean {
  if (data.key.fromMe) return false;

  const text = extractText(data);
  if (!text) return false;

  return true;
}

export const webhookRouter = Router();

webhookRouter.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    message: "Webhook Bento ativo. Use POST com eventos da Evolution API.",
    accepts: "POST",
    event: "messages.upsert",
  });
});

webhookRouter.post("/", (req: Request, res: Response) => {
  res.status(200).json({ received: true });

  const payload = req.body as EvolutionWebhookPayload;

  if (payload.event !== "messages.upsert") {
    return;
  }

  const messages: EvolutionMessageData[] = Array.isArray(payload.data)
    ? payload.data
    : [payload.data];

  for (const data of messages) {
    if (!isProcessableMessage(data)) continue;

    const text = extractText(data)!;
    const phone = extractPhoneFromJid(data.key.remoteJid);

    enqueueForUser(phone, () =>
      processMessage({
        phone,
        text,
        pushName: data.pushName,
        messageType: data.messageType ?? "text",
      })
    ).catch((err) => {
      console.error(`Falha no processamento assíncrono (${phone}):`, err);
    });
  }
});
