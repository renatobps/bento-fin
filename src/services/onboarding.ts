import type { PendingContext } from "../repositories/conversation-state.js";
import { setPendingContext } from "../repositories/conversation-state.js";
import { setInitialBalance } from "../repositories/account-balance.js";
import { getAccountBalance } from "../repositories/account-balance.js";
import { upsertCreditCard } from "../repositories/credit-cards.js";
import { env } from "../config/env.js";
import { extractAmountFromText } from "../utils/amount-parser.js";
import { extractCardNameFromText } from "../utils/card-name.js";
import {
  isNoResponse,
  isYesResponse,
} from "../utils/yes-no-response.js";
import {
  sendWhatsAppTextWithFallback,
  sendWhatsAppYesNo,
} from "./evolution.js";

const CONCLUSION_MESSAGE = `Tudo certo! 🎉 Seu perfil financeiro está configurado.

Agora você pode:
• "gastei 30 no almoço" — registrar gasto
• "ganhei 1000 de salário" — registrar receita
• "quanto gastei hoje?" — consultar gastos
• "qual meu saldo?" — ver saldo disponível
• "paguei a fatura do Nubank de 850" — registrar pagamento de fatura`;

function buildSignupWelcomeMessage(): string {
  return (
    `Olá! 👋 Bem-vindo ao Bento — seu assistente financeiro no WhatsApp.\n\n` +
    `Veja o que você pode fazer:\n` +
    `— Registre gastos e receitas por texto ou áudio\n` +
    `— Consulte saldo, cartões e limites quando quiser\n` +
    `— Acompanhe tudo no dashboard: ${env.frontendUrl}\n\n` +
    `Vou fazer algumas perguntas rápidas para configurar seu perfil — leva menos de 1 minuto. 👇`
  );
}

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
    await sendWhatsAppTextWithFallback({
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
  await sendWhatsAppTextWithFallback({
    phone,
    text: "Quanto você tem disponível hoje na sua conta? 💰\n(ex: 1500 ou 2350,50)",
  });
}

export async function sendSignupWelcomeAndStartOnboarding(
  phone: string,
  userId: number
): Promise<void> {
  await sendWhatsAppTextWithFallback({
    phone,
    text: buildSignupWelcomeMessage(),
  });
  await startOnboarding(phone, userId);
}

async function finishOnboarding(userId: number, phone: string): Promise<void> {
  await setPendingContext(userId, null);
  const message =
    `${CONCLUSION_MESSAGE}\n\n` +
    `Dúvidas? Responda "ajuda" a qualquer momento ou escreva para ${env.supportEmail}.`;
  await sendWhatsAppTextWithFallback({ phone, text: message });
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
      await sendWhatsAppTextWithFallback({
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
      await sendWhatsAppTextWithFallback({
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
      await sendWhatsAppTextWithFallback({
        phone,
        text: "Informe o nome e limite do cartão (ex: Nubank 3000) ou diga *pronto* para finalizar.",
      });
      return true;
    }

    await upsertCreditCard(userId, card.name, card.limit);
    await setPendingContext(userId, { awaiting_more_cards: true });
    await sendWhatsAppTextWithFallback({
      phone,
      text: "Tem outro cartão? Me informe o próximo (ex: Inter 2000) ou diga *pronto* para finalizar.",
    });
    return true;
  }

  return false;
}

export { isOnboardingContext };
