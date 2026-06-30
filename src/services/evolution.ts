import { env } from "../config/env.js";
import type { EvolutionMessageData } from "../types/evolution.js";

interface SendTextParams {
  phone: string;
  text: string;
}

interface MediaBase64Result {
  base64: string;
  mimetype?: string;
}

function formatPhoneJid(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.includes("@") ? digits : `${digits}@s.whatsapp.net`;
}

function stripBase64DataUrl(value: string): string {
  const commaIndex = value.indexOf(",");
  if (value.startsWith("data:") && commaIndex !== -1) {
    return value.slice(commaIndex + 1);
  }
  return value;
}

export async function sendWhatsAppText(params: SendTextParams): Promise<void> {
  const url = `${env.whatsapp.apiUrl}/message/sendText/${env.whatsapp.instanceName}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.whatsapp.apiKey,
    },
    body: JSON.stringify({
      number: formatPhoneJid(params.phone),
      text: params.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Evolution API erro ${response.status}: ${body}`);
  }
}

export async function getMediaBase64(
  data: EvolutionMessageData,
  convertToMp4 = false
): Promise<MediaBase64Result> {
  const url = `${env.whatsapp.apiUrl}/chat/getBase64FromMediaMessage/${env.whatsapp.instanceName}`;

  const payloads = [
    { message: { key: data.key, message: data.message }, convertToMp4 },
    { message: { key: data.key }, convertToMp4 },
    { message: { key: { id: data.key.id } }, convertToMp4 },
    { message: { key: data.key, message: data.message }, convertToMp4: true },
    { message: { key: data.key }, convertToMp4: true },
  ];

  let lastError = "sem resposta";

  for (const body of payloads) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.whatsapp.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      lastError = `${response.status}: ${await response.text()}`;
      continue;
    }

    const result = (await response.json()) as {
      base64?: string;
      mimetype?: string;
    };

    if (result.base64) {
      return {
        base64: stripBase64DataUrl(result.base64),
        mimetype: result.mimetype,
      };
    }

    lastError = "resposta sem base64";
  }

  throw new Error(`Evolution API mídia — ${lastError}`);
}
