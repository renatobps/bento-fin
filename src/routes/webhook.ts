import { Router, Request, Response } from "express";
import { timingSafeEqual } from "crypto";
import { env } from "../config/env.js";
import type { EvolutionWebhookPayload } from "../types/evolution.js";
import { extractPhoneFromJid } from "../utils/format.js";
import { enqueueForUser } from "../services/user-queue.js";
import { shouldProcessMessage } from "../services/message-dedup.js";
import { processMessage } from "../services/message-processor.js";
import { transcribeAudioMessage } from "../services/audio-transcriber.js";
import { sendWhatsAppText } from "../services/evolution.js";
import { findOrCreateUser } from "../repositories/users.js";
import { checkAudioAccess } from "../services/plan-checker.js";
import {
  extractText,
  isAudioMessage,
  isButtonResponse,
  isProcessableMessage,
} from "../utils/message-extract.js";
import { normalizeMessageData } from "../utils/webhook-payload.js";

async function processAudioMessage(data: import("../types/evolution.js").EvolutionMessageData): Promise<void> {
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

/** Evolution GO emite "MESSAGE"/"Message"; a Evolution v2 emitia "messages.upsert". */
const INCOMING_MESSAGE_EVENTS = new Set(["message", "messages.upsert"]);

function isIncomingMessageEvent(event: string | undefined): boolean {
  if (!event) return false;
  return INCOMING_MESSAGE_EVENTS.has(event.toLowerCase());
}

webhookRouter.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    message: "Webhook Bento ativo. Use POST com eventos do Evolution GO.",
    accepts: "POST",
    event: "MESSAGE",
  });
});

function getWebhookApiKey(req: Request): string | undefined {
  const header = req.headers.apikey;
  if (typeof header === "string") return header;
  if (Array.isArray(header)) return header[0];

  const query = req.query.apikey;
  if (typeof query === "string") return query;

  return undefined;
}

function isValidWebhookSecret(received: string | undefined): boolean {
  if (!received) return false;
  const expected = Buffer.from(env.whatsapp.webhookSecret, "utf8");
  const actual = Buffer.from(received, "utf8");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

webhookRouter.post("/", async (req: Request, res: Response) => {
  if (!isValidWebhookSecret(getWebhookApiKey(req))) {
    console.warn(
      "Webhook rejeitado: apikey ausente ou inválida. O Evolution GO não envia o header apikey — inclua ?apikey=<token> na webhookUrl da instância."
    );
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  const payload = req.body as EvolutionWebhookPayload;

  if (payload.instance && payload.instance !== env.whatsapp.instanceName) {
    console.warn(
      `Webhook ignorado: instância "${payload.instance}" difere de WHATSAPP_INSTANCE_NAME ("${env.whatsapp.instanceName}")`
    );
    res.status(200).json({ received: true, ignored: true });
    return;
  }

  res.status(200).json({ received: true });

  if (!isIncomingMessageEvent(payload.event)) {
    return;
  }

  const rawMessages = Array.isArray(payload.data) ? payload.data : [payload.data];

  for (const raw of rawMessages) {
    try {
      await handleIncomingMessage(raw);
    } catch (err) {
      console.error("Falha ao tratar evento do webhook:", err);
    }
  }
});

async function handleIncomingMessage(raw: unknown): Promise<void> {
  const data = normalizeMessageData(raw);

  if (!data) {
    console.warn(
      "Webhook: payload de mensagem não reconhecido —",
      JSON.stringify(raw).slice(0, 800)
    );
    return;
  }

  if (!isProcessableMessage(data)) return;

  const phone = extractPhoneFromJid(data.key.remoteJid);

  if (!(await shouldProcessMessage(phone, data.key.id))) {
    console.log(`Mensagem duplicada ignorada (${phone}, id=${data.key.id})`);
    return;
  }

  if (isAudioMessage(data)) {
    enqueueForUser(phone, async () => {
      const user = await findOrCreateUser(phone, data.pushName);
      if (!(await checkAudioAccess(user.id, phone))) return;
      await processAudioMessage(data);
    }).catch((err) => {
      console.error(`Falha no processamento de áudio (${phone}):`, err);
    });
    return;
  }

  const text = extractText(data);
  if (!text) {
    if (isButtonResponse(data)) {
      console.warn(
        `Clique em botão não interpretado (${phone}, type=${data.messageType})`
      );
      await sendWhatsAppText({
        phone,
        text: "Não consegui ler sua resposta. Responda *sim* ou *não* por texto.",
      });
    }
    return;
  }

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
