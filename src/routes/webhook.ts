import { Router, Request, Response } from "express";
import type {
  EvolutionMessageData,
  EvolutionWebhookPayload,
} from "../types/evolution.js";
import { extractPhoneFromJid } from "../utils/format.js";
import { enqueueForUser } from "../services/user-queue.js";
import { processMessage } from "../services/message-processor.js";
import { transcribeAudioMessage } from "../services/audio-transcriber.js";
import { sendWhatsAppText } from "../services/evolution.js";

function extractText(data: EvolutionMessageData): string | null {
  if (data.message?.conversation) {
    return data.message.conversation;
  }
  if (data.message?.extendedTextMessage?.text) {
    return data.message.extendedTextMessage.text;
  }
  return null;
}

function isAudioMessage(data: EvolutionMessageData): boolean {
  return (
    data.messageType === "audioMessage" || !!data.message?.audioMessage
  );
}

function isProcessableMessage(data: EvolutionMessageData): boolean {
  if (data.key.fromMe) return false;
  return !!extractText(data) || isAudioMessage(data);
}

async function processAudioMessage(data: EvolutionMessageData): Promise<void> {
  const phone = extractPhoneFromJid(data.key.remoteJid);

  try {
    const text = await transcribeAudioMessage(data);
    console.log(`Áudio transcrito (${phone}): ${text}`);

    await processMessage({
      phone,
      text,
      pushName: data.pushName,
      messageType: data.messageType ?? "audioMessage",
      source: "audio",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Erro ao processar áudio (${phone}):`, message);

    const userMessage = message.includes("OPENAI_API_KEY")
      ? "Transcrição de áudio não configurada. Reinicie o backend após adicionar OPENAI_API_KEY no .env."
      : message.includes("insufficient_quota") || message.includes("429")
        ? "Transcrição de áudio indisponível no momento (cota OpenAI esgotada). Use texto por enquanto ou adicione créditos em platform.openai.com."
        : "Não consegui entender o áudio. Tente enviar por texto ou grave novamente.";

    await sendWhatsAppText({ phone, text: userMessage });
  }
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

    const phone = extractPhoneFromJid(data.key.remoteJid);

    if (isAudioMessage(data)) {
      enqueueForUser(phone, () => processAudioMessage(data)).catch((err) => {
        console.error(`Falha no processamento de áudio (${phone}):`, err);
      });
      continue;
    }

    const text = extractText(data)!;

    enqueueForUser(phone, () =>
      processMessage({
        phone,
        text,
        pushName: data.pushName,
        messageType: data.messageType ?? "text",
        source: "text",
      })
    ).catch((err) => {
      console.error(`Falha no processamento assíncrono (${phone}):`, err);
    });
  }
});
