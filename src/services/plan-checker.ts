import { sendWhatsAppText } from "./evolution.js";
import {
  consumeUsageLimit,
  getLimitUsageCounts,
  getUserSubscription,
  hasPaidAccess,
  PLAN_LIMITS,
} from "../repositories/subscription.js";
import { env } from "../config/env.js";

const UPGRADE_URL = `${env.frontendUrl}/planos`;

function buildLimitMessage(type: "expense" | "income", limit: number): string {
  const label = type === "expense" ? "gastos" : "receitas";
  return (
    `Você atingiu o limite de ${limit} ${label} no plano gratuito este mês. 🔒\n\n` +
    `Para continuar registrando, assine o plano Essencial por R$14,90/mês:\n` +
    `👉 ${UPGRADE_URL}\n\n` +
    `Você ainda pode consultar seus gastos e saldo normalmente.`
  );
}

export async function checkUsageLimit(
  userId: number,
  phone: string,
  type: "expense" | "income",
  count = 1
): Promise<boolean> {
  const result = await consumeUsageLimit(userId, type, count);
  if (result.ok) return true;

  await sendWhatsAppText({ phone, text: buildLimitMessage(type, result.limit) });
  return false;
}

export async function checkAudioAccess(
  userId: number,
  phone: string
): Promise<boolean> {
  const user = await getUserSubscription(userId);
  if (!user) return true;

  if (hasPaidAccess(user.subscription_plan, user.subscription_status, user.subscription_expires_at)) {
    return true;
  }

  await sendWhatsAppText({
    phone,
    text:
      `Mensagens de áudio são exclusivas do plano Essencial. 🎙️\n\n` +
      `Assine por R$14,90/mês e registre gastos falando:\n` +
      `👉 ${UPGRADE_URL}\n\n` +
      `Por enquanto, envie por texto.`,
  });
  return false;
}

export async function getRemainingExpenses(userId: number): Promise<number | null> {
  const user = await getUserSubscription(userId);
  if (!user) return null;

  if (hasPaidAccess(user.subscription_plan, user.subscription_status, user.subscription_expires_at)) {
    return null;
  }

  const usage = await getLimitUsageCounts(userId);
  return Math.max(0, PLAN_LIMITS.free.expenses! - usage.expenses);
}
