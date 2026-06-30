import { env } from "../config/env.js";

interface SendTextParams {
  phone: string;
  text: string;
}

function formatPhoneJid(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.includes("@") ? digits : `${digits}@s.whatsapp.net`;
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
