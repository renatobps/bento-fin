import { randomInt, timingSafeEqual } from "crypto";
import { query } from "../db/pool.js";
import { sendWhatsAppTextWithFallback } from "../services/evolution.js";
import { normalizePhone } from "../utils/phone.js";

/** Após esse número de chutes o código é queimado e o usuário precisa pedir outro. */
const MAX_VERIFY_ATTEMPTS = 5;

export function generateOtpCode(): string {
  return randomInt(100000, 999999).toString();
}

function codesMatch(expected: string, received: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function createOtp(phone: string): Promise<string> {
  const normalized = normalizePhone(phone);
  const code = generateOtpCode();

  // Um código novo invalida os anteriores: evita que vários códigos válidos
  // convivam e multipliquem a chance de acerto por tentativa.
  await query(`UPDATE auth_otp SET used = true WHERE phone = $1 AND used = false`, [
    normalized,
  ]);

  await query(
    `INSERT INTO auth_otp (phone, code, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
    [normalized, code]
  );

  try {
    await sendWhatsAppTextWithFallback({
      phone: normalized,
      text: `Seu código de acesso ao Bento: *${code}*\n\nVálido por 10 minutos. Não compartilhe com ninguém.`,
    });
  } catch (err) {
    await query(`DELETE FROM auth_otp WHERE phone = $1 AND code = $2`, [normalized, code]);
    throw err;
  }

  return normalized;
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  const normalizedCode = code.replace(/\D/g, "").trim();

  if (normalizedCode.length !== 6) return false;

  const pending = await query<{ id: number; code: string; attempts: number }>(
    `SELECT id, code, attempts FROM auth_otp
     WHERE phone = $1 AND used = false AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [normalized]
  );

  const otp = pending.rows[0];
  if (!otp) return false;

  if (otp.attempts + 1 >= MAX_VERIFY_ATTEMPTS) {
    await query(`UPDATE auth_otp SET used = true, attempts = attempts + 1 WHERE id = $1`, [
      otp.id,
    ]);
    return codesMatch(otp.code, normalizedCode);
  }

  if (!codesMatch(otp.code, normalizedCode)) {
    await query(`UPDATE auth_otp SET attempts = attempts + 1 WHERE id = $1`, [otp.id]);
    return false;
  }

  const consumed = await query(
    `UPDATE auth_otp SET used = true WHERE id = $1 AND used = false`,
    [otp.id]
  );

  return (consumed.rowCount ?? 0) > 0;
}
