import { randomInt } from "crypto";
import { query } from "../db/pool.js";
import { sendWhatsAppText } from "../services/evolution.js";
import { normalizePhone } from "../utils/phone.js";

export function generateOtpCode(): string {
  return randomInt(100000, 999999).toString();
}

export async function createOtp(phone: string): Promise<string> {
  const normalized = normalizePhone(phone);
  const code = generateOtpCode();

  await query(
    `INSERT INTO auth_otp (phone, code, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
    [normalized, code]
  );

  await sendWhatsAppText({
    phone: normalized,
    text: `Seu código de acesso ao Bento: *${code}*\n\nVálido por 10 minutos. Não compartilhe com ninguém.`,
  });

  return normalized;
}

export async function verifyOtp(
  phone: string,
  code: string
): Promise<boolean> {
  const normalized = normalizePhone(phone);
  const normalizedCode = code.replace(/\D/g, "").trim();

  const result = await query<{ id: number }>(
    `UPDATE auth_otp
     SET used = true
     WHERE id = (
       SELECT id FROM auth_otp
       WHERE phone = $1 AND code = $2 AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1
     )
     RETURNING id`,
    [normalized, normalizedCode]
  );

  return result.rowCount !== null && result.rowCount > 0;
}
