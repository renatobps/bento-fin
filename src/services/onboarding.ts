import type { PendingContext } from "../repositories/conversation-state.js";
import { setPendingContext } from "../repositories/conversation-state.js";
import { setInitialBalance } from "../repositories/account-balance.js";
import { getAccountBalance } from "../repositories/account-balance.js";
import { upsertCreditCard } from "../repositories/credit-cards.js";
import { sendWhatsAppText } from "./evolution.js";

const CONCLUSION_MESSAGE = `Tudo certo! 🎉 Seu perfil financeiro está configurado.

Agora você pode:
• "gastei 30 no almoço" — registrar gasto
• "ganhei 1000 de salário" — registrar receita
• "quanto gastei hoje?" — consultar gastos
• "qual meu saldo?" — ver saldo disponível
• "paguei a fatura do Nubank de 850" — registrar pagamento de fatura`;

function extractAmount(text: string): number | null {
  const normalized = text.replace(/\./g, "").replace(",", ".");
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function extractCardNameAndLimit(
  text: string
): { name: string; limit: number } | null {
  const amount = extractAmount(text);
  if (amount === null) return null;

  const withoutAmount = text
    .replace(/[\d.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const name = withoutAmount || "Cartão";
  return { name, limit: amount };
}

function isYes(text: string): boolean {
  return /\bsim\b/i.test(text);
}

function isNo(text: string): boolean {
  return /\bn[aã]o\b/i.test(text);
}

function isDone(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  return ["pronto", "ok", "finalizar", "concluir", "terminar", "nao", "não"].some(
    (word) => normalized.includes(word)
  );
}

function isOnboardingContext(pending: PendingContext | null): boolean {
  if (!pending) return false;
  return (
    pending.awaiting_initial_balance === true ||
    pending.awaiting_credit_card === true ||
    pending.awaiting_card_limit === true ||
    pending.awaiting_more_cards === true
  );
}

export async function needsOnboarding(userId: number): Promise<boolean> {
  const balance = await getAccountBalance(userId);
  return balance === null;
}

export async function startOnboarding(
  phone: string,
  userId: number
): Promise<void> {
  await setPendingContext(userId, { awaiting_initial_balance: true });
  await sendWhatsAppText({
    phone,
    text: "Para começar, preciso de algumas informações rápidas sobre sua situação financeira. 💰 Quanto você tem disponível hoje na sua conta? (ex: 1500 ou 2350,50)",
  });
}

async function finishOnboarding(userId: number, phone: string): Promise<void> {
  await setPendingContext(userId, null);
  await sendWhatsAppText({ phone, text: CONCLUSION_MESSAGE });
}

export async function handleOnboardingStep(
  userId: number,
  phone: string,
  text: string,
  pending: PendingContext
): Promise<boolean> {
  if (!isOnboardingContext(pending)) {
    return false;
  }

  if (pending.awaiting_initial_balance) {
    const amount = extractAmount(text);
    if (amount === null) {
      await sendWhatsAppText({
        phone,
        text: "Não entendi o valor. Informe quanto você tem disponível hoje (ex: 1500 ou 2350,50).",
      });
      return true;
    }

    await setInitialBalance(userId, amount);
    await setPendingContext(userId, { awaiting_credit_card: true });
    await sendWhatsAppText({
      phone,
      text: "Ótimo! Você usa cartão de crédito? Responda *sim* ou *não*.",
    });
    return true;
  }

  if (pending.awaiting_credit_card) {
    if (isYes(text)) {
      await setPendingContext(userId, { awaiting_card_limit: true });
      await sendWhatsAppText({
        phone,
        text: "Qual o nome e limite do cartão? (ex: Nubank 3000 ou Itaú 5000)",
      });
      return true;
    }

    if (isNo(text)) {
      await finishOnboarding(userId, phone);
      return true;
    }

    await sendWhatsAppText({
      phone,
      text: "Responda *sim* ou *não*.",
    });
    return true;
  }

  if (pending.awaiting_card_limit || pending.awaiting_more_cards) {
    if (isDone(text)) {
      await finishOnboarding(userId, phone);
      return true;
    }

    const card = extractCardNameAndLimit(text);
    if (!card) {
      await sendWhatsAppText({
        phone,
        text: "Informe o nome e limite do cartão (ex: Nubank 3000) ou diga *pronto* para finalizar.",
      });
      return true;
    }

    await upsertCreditCard(userId, card.name, card.limit);
    await setPendingContext(userId, { awaiting_more_cards: true });
    await sendWhatsAppText({
      phone,
      text: "Tem outro cartão? Me informe o próximo (ex: Inter 2000) ou diga *pronto* para finalizar.",
    });
    return true;
  }

  return false;
}

export { isOnboardingContext };
