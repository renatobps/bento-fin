import { Router, Request, Response } from "express";
import { createOtp, verifyOtp } from "../repositories/auth-otp.js";
import { findOrCreateUser } from "../repositories/users.js";
import { signToken } from "../middleware/auth.js";
import { formatPhoneDisplay, isValidBrazilPhone, normalizePhone } from "../utils/phone.js";

export const authRouter = Router();

authRouter.post("/request-otp", async (req: Request, res: Response) => {
  try {
    const { phone } = req.body as { phone?: string };

    if (!phone || !isValidBrazilPhone(phone)) {
      res.status(400).json({ error: "Telefone inválido. Use DDD + número, ex: 6198595681" });
      return;
    }

    const normalized = await createOtp(phone);
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
      user: { id: user.id, phone: user.phone, name: user.name },
    });
  } catch (err) {
    console.error("Erro ao verificar OTP:", err);
    res.status(500).json({ error: "Falha na verificação" });
  }
});
