import { env } from "../config/env.js";
import type { EvolutionMessageData } from "../types/evolution.js";

interface SendTextParams {
  phone: string;
  text: string;
}

export interface WhatsAppButton {
  type: "reply";
  displayText: string;
  id: string;
}

interface SendButtonsParams {
  phone: string;
  title: string;
  description: string;
  buttons: WhatsAppButton[];
}

export const BENTO_YES_BUTTON_ID = "bento_yes";
export const BENTO_NO_BUTTON_ID = "bento_no";

function formatPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, "");
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

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  errorMessage: string
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(errorMessage);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function sendWhatsAppText(params: SendTextParams): Promise<void> {
  const url = `${env.whatsapp.apiUrl}/message/sendText/${env.whatsapp.instanceName}`;

  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.whatsapp.apiKey,
      },
      body: JSON.stringify({
        number: formatPhoneJid(params.phone),
        text: params.text,
      }),
    },
    10000,
    "Timeout na Evolution API após 10s"
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Evolution API erro ${response.status}: ${body}`);
  }
}

export async function sendWhatsAppButtons(
  params: SendButtonsParams
): Promise<void> {
  const url = `${env.whatsapp.apiUrl}/message/sendButtons/${env.whatsapp.instanceName}`;

  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.whatsapp.apiKey,
      },
      body: JSON.stringify({
        number: formatPhoneNumber(params.phone),
        title: params.title,
        description: params.description,
        buttons: params.buttons,
      }),
    },
    10000,
    "Timeout na Evolution API após 10s"
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Evolution API erro ${response.status}: ${body}`);
  }
}

/** Envia pergunta SIM/NÃO com botões interativos. */
export async function sendWhatsAppYesNo(params: {
  phone: string;
  title: string;
  description: string;
  yesId?: string;
  noId?: string;
}): Promise<void> {
  await sendWhatsAppButtons({
    phone: params.phone,
    title: params.title,
    description: params.description,
    buttons: [
      {
        type: "reply",
        displayText: "SIM",
        id: params.yesId ?? BENTO_YES_BUTTON_ID,
      },
      {
        type: "reply",
        displayText: "NÃO",
        id: params.noId ?? BENTO_NO_BUTTON_ID,
      },
    ],
  });
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
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: env.whatsapp.apiKey,
        },
        body: JSON.stringify(body),
      },
      10000,
      "Timeout na Evolution API após 10s"
    );

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
