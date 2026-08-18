import { env } from "../config/env.js";
import type { EvolutionMessageData } from "../types/evolution.js";
import { alternateBrazilMobile } from "../utils/phone.js";

export class WhatsAppDeliveryError extends Error {
  readonly code: "not_registered" | "api_error";
  readonly status?: number;

  constructor(message: string, code: "not_registered" | "api_error", status?: number) {
    super(message);
    this.name = "WhatsAppDeliveryError";
    this.code = code;
    this.status = status;
  }
}

const NOT_REGISTERED_PATTERNS = [
  "not registered",
  "not on whatsapp",
  "no phone registered",
  "invalid jid",
  "user not found",
  "number not found",
];

function evolutionBodyIndicatesNotRegistered(body: string): boolean {
  if (body.includes('"exists":false')) return true;

  const lower = body.toLowerCase();
  if (NOT_REGISTERED_PATTERNS.some((pattern) => lower.includes(pattern))) {
    return true;
  }

  try {
    const parsed = JSON.parse(body) as {
      response?: { message?: Array<{ exists?: boolean }> };
    };
    const messages = parsed.response?.message;
    return Array.isArray(messages) && messages.some((item) => item.exists === false);
  } catch {
    return false;
  }
}

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
  /** Obrigatório no Evolution GO; usa "Bento" quando omitido. */
  footer?: string;
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

/** Evolution GO identifica a instância pelo token no header `apikey`. */
async function evolutionPost(
  path: string,
  body: unknown
): Promise<Response> {
  return fetchWithTimeout(
    `${env.whatsapp.apiUrl}${path}`,
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
}

export async function sendWhatsAppText(params: SendTextParams): Promise<void> {
  const response = await evolutionPost("/send/text", {
    number: formatPhoneNumber(params.phone),
    text: params.text,
  });

  if (!response.ok) {
    const body = await response.text();
    if (
      (response.status === 400 || response.status === 404) &&
      evolutionBodyIndicatesNotRegistered(body)
    ) {
      throw new WhatsAppDeliveryError(
        "Número não registrado no WhatsApp",
        "not_registered",
        response.status
      );
    }
    throw new WhatsAppDeliveryError(
      `Evolution API erro ${response.status}: ${body}`,
      "api_error",
      response.status
    );
  }
}

export async function sendWhatsAppTextWithFallback(params: SendTextParams): Promise<void> {
  try {
    await sendWhatsAppText(params);
  } catch (err) {
    if (!(err instanceof WhatsAppDeliveryError) || err.code !== "not_registered") {
      throw err;
    }

    const alternate = alternateBrazilMobile(params.phone);
    if (!alternate || alternate === params.phone.replace(/\D/g, "")) {
      throw err;
    }

    await sendWhatsAppText({ ...params, phone: alternate });
  }
}

export async function sendWhatsAppButtons(
  params: SendButtonsParams
): Promise<void> {
  const response = await evolutionPost("/send/button", {
    number: formatPhoneNumber(params.phone),
    title: params.title,
    description: params.description,
    footer: params.footer ?? "Bento",
    buttons: params.buttons,
  });

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

/** O Evolution GO retorna o binário em chaves diferentes conforme o tipo de mídia. */
function extractBase64(payload: Record<string, unknown>): string | null {
  for (const key of ["base64", "data", "media", "Data", "file"]) {
    const value = payload[key];
    if (typeof value === "string" && value.length > 0) {
      return stripBase64DataUrl(value);
    }
  }
  return null;
}

function extractMimetype(payload: Record<string, unknown>): string | undefined {
  for (const key of ["mimetype", "mimeType", "Mimetype"]) {
    const value = payload[key];
    if (typeof value === "string" && value) return value;
  }
  return undefined;
}

export async function getMediaBase64(
  data: EvolutionMessageData
): Promise<MediaBase64Result> {
  const response = await evolutionPost("/message/downloadimage", {
    message: data.message,
  });

  if (!response.ok) {
    throw new Error(
      `Evolution API mídia — ${response.status}: ${await response.text()}`
    );
  }

  const result = (await response.json()) as Record<string, unknown>;
  const base64 = extractBase64(result);

  if (!base64) {
    throw new Error("Evolution API mídia — resposta sem base64");
  }

  return {
    base64,
    mimetype: extractMimetype(result) ?? data.message?.audioMessage?.mimetype,
  };
}
