import { Router, Request, Response } from "express";
import { createOtp, verifyOtp } from "../repositories/auth-otp.js";
import { findOrCreateUser } from "../repositories/users.js";
import { signToken } from "../middleware/auth.js";
import { formatPhoneDisplay, isValidBrazilPhone, normalizePhone } from "../utils/phone.js";

const OTP_RATE_LIMIT = 3;
const OTP_RATE_WINDOW_MS = 60 * 60 * 1000;

const otpRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkOtpRateLimit(normalizedPhone: string): boolean {
  const now = Date.now();
  const entry = otpRateLimits.get(normalizedPhone);

  if (entry && entry.resetAt <= now) {
    otpRateLimits.delete(normalizedPhone);
  }

  const current = otpRateLimits.get(normalizedPhone);
  if (current && current.count >= OTP_RATE_LIMIT) {
    return false;
  }

  return true;
}

function recordOtpRequest(normalizedPhone: string): void {
  const now = Date.now();
  const entry = otpRateLimits.get(normalizedPhone);

  if (entry && entry.resetAt > now) {
    entry.count += 1;
    return;
  }

  otpRateLimits.set(normalizedPhone, {
    count: 1,
    resetAt: now + OTP_RATE_WINDOW_MS,
  });
}

export const authRouter = Router();

authRouter.post("/request-otp", async (req: Request, res: Response) => {
  try {
    const { phone } = req.body as { phone?: string };

    if (!phone || !isValidBrazilPhone(phone)) {
      res.status(400).json({ error: "Telefone inválido. Use DDD + número, ex: 6198595681" });
      return;
    }

    const normalized = normalizePhone(phone);

    if (!checkOtpRateLimit(normalized)) {
      res.status(429).json({
        error: "Muitas tentativas. Aguarde 1 hora antes de solicitar um novo código.",
      });
      return;
    }

    await createOtp(phone);
    recordOtpRequest(normalized);
    await findOrCreateUser(normalized);

    res.json({
      ok: true,
      message: "Código enviado via WhatsApp",
      phone: formatPhoneDisplay(normalized),
    });
  } catch (err) {
    console.error("Erro ao enviar OTP:", err);
    res.status(500).json({ error: "Falha ao enviar código" });
  }
});

authRouter.post("/verify-otp", async (req: Request, res: Response) => {
  try {
    const { phone, code } = req.body as { phone?: string; code?: string };

    if (!phone || !code) {
      res.status(400).json({ error: "Telefone e código são obrigatórios" });
      return;
    }

    const valid = await verifyOtp(phone, code);
    if (!valid) {
      res.status(401).json({ error: "Código inválido ou expirado" });
      return;
    }

    const user = await findOrCreateUser(normalizePhone(phone));
    const token = signToken({ userId: user.id, phone: user.phone });

    res.json({
      token,
      user: { id: user.id, phone: user.phone, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Erro ao verificar OTP:", err);
    res.status(500).json({ error: "Falha na verificação" });
  }
});
