import type { PendingContext } from "../repositories/conversation-state.js";
import { setPendingContext } from "../repositories/conversation-state.js";
import { setInitialBalance } from "../repositories/account-balance.js";
import { getAccountBalance } from "../repositories/account-balance.js";
import { upsertCreditCard } from "../repositories/credit-cards.js";
import { extractAmountFromText } from "../utils/amount-parser.js";
import { extractCardNameFromText } from "../utils/card-name.js";
import {
  isNoResponse,
  isYesResponse,
} from "../utils/yes-no-response.js";
import { sendWhatsAppText, sendWhatsAppYesNo } from "./evolution.js";

const CONCLUSION_MESSAGE = `Tudo certo! 🎉 Seu perfil financeiro está configurado.

Agora você pode:
• "gastei 30 no almoço" — registrar gasto
• "ganhei 1000 de salário" — registrar receita
• "quanto gastei hoje?" — consultar gastos
• "qual meu saldo?" — ver saldo disponível
• "paguei a fatura do Nubank de 850" — registrar pagamento de fatura`;

function extractAmount(text: string): number | null {
  return extractAmountFromText(text);
}

function extractCardNameAndLimit(
  text: string
): { name: string; limit: number } | null {
  const amount = extractAmountFromText(text);
  if (amount === null) return null;

  let name = extractCardNameFromText(text);

  if (!name) {
    const genericWords = new Set([
      "cartao",
      "cartão",
      "limite",
      "de",
      "com",
      "e",
      "do",
      "da",
      "no",
      "na",
    ]);
    const words = text
      .replace(/[\d.,]+/g, " ")
      .split(/\s+/)
      .map((w) => w.trim())
      .filter(Boolean)
      .filter((w) => !genericWords.has(w.toLowerCase()));

    if (words.length > 0) {
      const raw = words[0];
      name = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    }
  }

  return { name: name ?? "Cartão", limit: amount };
}

// Testes manuais:
// "Nubank 3000" → {name: "Nubank", limit: 3000}
// "cartão Nubank limite 3000" → {name: "Nubank", limit: 3000}
// "Inter 2500" → {name: "Inter", limit: 2500}

function isYes(text: string): boolean {
  return isYesResponse(text);
}

function isNo(text: string): boolean {
  return isNoResponse(text);
}

async function askCreditCardQuestion(phone: string): Promise<void> {
  try {
    await sendWhatsAppYesNo({
      phone,
      title: "Cartão de crédito",
      description: "Você usa cartão de crédito?",
    });
  } catch (err) {
    console.error("Erro ao enviar botões SIM/NÃO, usando texto:", err);
    await sendWhatsAppText({
      phone,
      text: "Ótimo! Você usa cartão de crédito? Responda *sim* ou *não*.",
    });
  }
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
    await askCreditCardQuestion(phone);
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

    await askCreditCardQuestion(phone);
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
