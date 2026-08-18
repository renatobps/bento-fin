import { Router, Request, Response } from "express";
import { getPendingContext } from "../repositories/conversation-state.js";
import { createOtp, verifyOtp } from "../repositories/auth-otp.js";
import { findOrCreateUser } from "../repositories/users.js";
import { signToken } from "../middleware/auth.js";
import { WhatsAppDeliveryError } from "../services/evolution.js";
import {
  isOnboardingContext,
  needsOnboarding,
  sendSignupWelcomeAndStartOnboarding,
} from "../services/onboarding.js";
import { formatPhoneDisplay, isValidBrazilPhone, normalizePhone } from "../utils/phone.js";
import { RateLimiter, clientIp } from "../utils/rate-limit.js";

const HOUR_MS = 60 * 60 * 1000;

const otpByPhone = new RateLimiter(3, HOUR_MS);
/** Impede que um único cliente dispare OTP para milhares de números. */
const otpByIp = new RateLimiter(10, HOUR_MS);
/** Trava a força bruta de código mesmo trocando o telefone alvo. */
const verifyByIp = new RateLimiter(20, 15 * 60 * 1000);

export const authRouter = Router();

authRouter.post("/request-otp", async (req: Request, res: Response) => {
  try {
    const { phone } = req.body as { phone?: string };

    if (!phone || !isValidBrazilPhone(phone)) {
      res.status(400).json({ error: "Telefone inválido. Use DDD + número, ex: 6198595681" });
      return;
    }

    const normalized = normalizePhone(phone);
    const ip = clientIp(req);

    if (!otpByPhone.allows(normalized) || !otpByIp.allows(ip)) {
      res.status(429).json({
        error: "Muitas tentativas. Aguarde 1 hora antes de solicitar um novo código.",
      });
      return;
    }

    otpByIp.record(ip);
    await createOtp(phone);
    otpByPhone.record(normalized);

    const user = await findOrCreateUser(normalized);

    try {
      const pending = await getPendingContext(user.id);
      if (await needsOnboarding(user.id) && !isOnboardingContext(pending)) {
        await sendSignupWelcomeAndStartOnboarding(normalized, user.id);
      }
    } catch (welcomeErr) {
      console.error("Erro ao enviar boas-vindas:", welcomeErr);
    }

    res.json({
      ok: true,
      message: "Código enviado via WhatsApp",
      phone: formatPhoneDisplay(normalized),
    });
  } catch (err) {
    console.error("Erro ao enviar OTP:", err);
    if (err instanceof WhatsAppDeliveryError && err.code === "not_registered") {
      res.status(400).json({
        error:
          "Este número não está registrado no WhatsApp. Confira o DDD e o número e tente novamente.",
      });
      return;
    }
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

    const ip = clientIp(req);
    if (!verifyByIp.allows(ip)) {
      res.status(429).json({
        error: "Muitas tentativas. Aguarde 15 minutos e solicite um novo código.",
      });
      return;
    }

    const valid = await verifyOtp(phone, code);
    if (!valid) {
      verifyByIp.record(ip);
      res.status(401).json({ error: "Código inválido ou expirado" });
      return;
    }

    verifyByIp.reset(ip);

    const user = await findOrCreateUser(normalizePhone(phone));

    if (user.is_blocked) {
      res.status(403).json({ error: "Conta suspensa. Entre em contato com o suporte." });
      return;
    }

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
