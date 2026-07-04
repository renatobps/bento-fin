import {
  classifyMessage,
  isLowConfidenceAmbiguous,
} from "./llm-parser.js";
import type { IntentSource, ParsedMessage } from "../types/parsed-message.js";
import { extractExpensesFromParsed } from "../types/parsed-message.js";
import { sendWhatsAppText } from "./evolution.js";
import { findOrCreateUser } from "../repositories/users.js";
import {
  getCategoryByName,
  normalizeCategory,
} from "../repositories/categories.js";
import {
  createExpense,
  deleteExpense,
  getExpensesForPeriod,
  getLastExpense,
  updateExpense,
} from "../repositories/expenses.js";
import { logMessage } from "../repositories/messages-log.js";
import {
  getPendingContext,
  setPendingContext,
} from "../repositories/conversation-state.js";
import {
  formatCurrency,
  getTodayISO,
  parseAmount,
} from "../utils/format.js";
import { extractAmountFromText, detectPaymentMethod } from "../utils/amount-parser.js";
import { extractCardNameFromText } from "../utils/card-name.js";
import { checkSpendingLimits, getLimitConsultationResponse } from "./spending-limit-checker.js";
import {
  getIncomeCategoryByName,
  normalizeIncomeCategory,
} from "../repositories/income-categories.js";
import { createIncome } from "../repositories/income.js";
import { createCreditPayment } from "../repositories/credit-payments.js";
import { getCreditDebtByCard, getCreditCards, updateCreditCardLimit } from "../repositories/credit-cards.js";
import {
  calculateBalance,
  formatBalanceSummary,
  formatCreditSummary,
} from "./balance-calculator.js";
import { personalizeMessage } from "../utils/user-display.js";
import {
  handleOnboardingStep,
  isOnboardingContext,
  needsOnboarding,
  startOnboarding,
} from "./onboarding.js";

export interface IncomingMessage {
  phone: string;
  text: string;
  pushName?: string;
  messageType: string;
  source?: "text" | "audio";
}

function formatExpenseLine(
  amount: number | string,
  categoryName: string,
  description?: string | null
): string {
  const value = typeof amount === "number" ? amount : parseAmount(amount);
  return `${formatCurrency(value)} - ${categoryName}${description ? ` (${description})` : ""}`;
}

function formatPaymentMethodLabel(method: string): string {
  switch (method) {
    case "pix":
      return "pix";
    case "debito":
      return "débito";
    case "credito":
      return "crédito";
    default:
      return "dinheiro";
  }
}

async function registerExpenses(
  userId: number,
  phone: string,
  parsed: ParsedMessage,
  source: "text" | "audio"
): Promise<Array<{ line: string; paymentMethod: string; cardName: string | null }>> {
  const defaultDate = parsed.expense_date ?? getTodayISO();
  const items = extractExpensesFromParsed(parsed);
  const paymentMethod = parsed.payment_method ?? "dinheiro";
  const cardName = parsed.card_name ?? null;
  const results: Array<{ line: string; paymentMethod: string; cardName: string | null }> = [];

  for (const item of items) {
    const categoryName = normalizeCategory(item.categoria);
    const category = await getCategoryByName(categoryName);
    const expenseDate = item.expense_date ?? defaultDate;

    await createExpense({
      userId,
      amount: item.valor,
      categoryId: category.id,
      description: item.descricao,
      expenseDate,
      source,
      paymentMethod,
      cardName,
    });

    await checkSpendingLimits(userId, phone, expenseDate);
    results.push({
      line: formatExpenseLine(item.valor, category.name, item.descricao),
      paymentMethod,
      cardName,
    });
  }

  return results;
}

async function logOnly(
  userId: number,
  msg: IncomingMessage,
  success: boolean,
  extras?: {
    inputTokens?: number;
    outputTokens?: number;
    detectedIntent?: string;
    intentSource?: IntentSource;
  }
): Promise<void> {
  try {
    await logMessage({
      userId,
      rawMessage: msg.text,
      messageType: msg.messageType.slice(0, 50),
      processedSuccessfully: success,
      inputTokens: extras?.inputTokens,
      outputTokens: extras?.outputTokens,
      detectedIntent: extras?.detectedIntent,
      intentSource: extras?.intentSource,
    });
  } catch (err) {
    console.error(`Erro ao salvar log da mensagem (${msg.phone}):`, err);
  }
}

async function respondAndLog(
  userId: number,
  msg: IncomingMessage,
  responseText: string,
  success: boolean,
  extras?: {
    inputTokens?: number;
    outputTokens?: number;
    detectedIntent?: string;
    intentSource?: IntentSource;
  }
): Promise<void> {
  await sendWhatsAppText({ phone: msg.phone, text: responseText });

  try {
    await logMessage({
      userId,
      rawMessage: msg.text,
      messageType: msg.messageType.slice(0, 50),
      processedSuccessfully: success,
      inputTokens: extras?.inputTokens,
      outputTokens: extras?.outputTokens,
      detectedIntent: extras?.detectedIntent,
      intentSource: extras?.intentSource,
    });
  } catch (err) {
    console.error(`Erro ao salvar log da mensagem (${msg.phone}):`, err);
  }
}

export async function processMessage(msg: IncomingMessage): Promise<void> {
  const user = await findOrCreateUser(msg.phone, msg.pushName);
  let success = false;
  let responseText = "";
  const source = msg.source ?? "text";
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  let detectedIntent: string | undefined;
  let intentSource: IntentSource | undefined;

  const pending = await getPendingContext(user.id);

  if (pending && isOnboardingContext(pending)) {
    const handled = await handleOnboardingStep(
      user.id,
      msg.phone,
      msg.text,
      pending
    );
    if (handled) {
      await logOnly(user.id, msg, true);
      return;
    }
  }

  if (await needsOnboarding(user.id) && !pending) {
    await startOnboarding(msg.phone, user.id);
    await logOnly(user.id, msg, true);
    return;
  }

  const isNewUser =
    Date.now() - new Date(user.created_at).getTime() < 60_000;

  if (isNewUser && !(await needsOnboarding(user.id))) {
    await sendWhatsAppText({
      phone: msg.phone,
      text: personalizeMessage(
        user.name,
        `👋 Olá! Sou o *Bento*, seu assistente financeiro no WhatsApp.

Veja como me usar:
• *Registrar gasto:* "gastei 30 reais com almoço" ou "gastei 20 com material e 30 com lanche"
• *Registrar receita:* "ganhei 1000 de salário"
• *Consultar gastos:* "quanto gastei hoje?" ou "essa semana" ou "esse mês"
• *Consultar saldo:* "qual meu saldo?"
• *Consultar limites:* "qual meu limite diário?" ou "quanto ainda posso gastar hoje?"
• *Corrigir último gasto:* "corrige para 35 reais"
• *Apagar último gasto:* "apaga o último gasto"

Pronto! Pode começar. 🎯`
      ),
    });
  }

  try {
    const awaitingValue = pending?.awaiting_value === true;

    const { parsed, usage, intentSource: classifiedSource } = await classifyMessage(
      msg.text,
      awaitingValue
    );
    inputTokens = usage.inputTokens;
    outputTokens = usage.outputTokens;
    detectedIntent = parsed.intent;
    intentSource = classifiedSource;

    if (isLowConfidenceAmbiguous(parsed, msg.text, awaitingValue)) {
      responseText =
        "Não entendi sua mensagem. Quer registrar um gasto ou consultar seus limites? Ex: \"gastei 30 reais\" ou \"quanto gastei hoje?\".";
      success = true;
    } else if (awaitingValue) {
      const amount = parsed.valor ?? extractAmountFromText(msg.text);
      if (amount !== null) {
      const categoryName = normalizeCategory(
        pending?.partial_category ?? parsed.categoria
      );
      const category = await getCategoryByName(categoryName);
      const description =
        pending?.partial_description ?? parsed.descricao ?? null;
      const expenseDate =
        pending?.partial_expense_date ?? parsed.expense_date ?? getTodayISO();
      const paymentMethod =
        parsed.payment_method ?? detectPaymentMethod(msg.text) ?? "dinheiro";

      await createExpense({
        userId: user.id,
        amount,
        categoryId: category.id,
        description,
        expenseDate,
        source,
        paymentMethod,
        cardName: parsed.card_name ?? null,
      });

      await checkSpendingLimits(user.id, msg.phone, expenseDate);
      await setPendingContext(user.id, null);

      const line = formatExpenseLine(amount, category.name, description);
      if (paymentMethod === "credito") {
        const debt = (await getCreditDebtByCard(user.id)).reduce(
          (sum, c) => sum + c.total,
          0
        );
        responseText = `Gasto registrado: ${line} · crédito${parsed.card_name ? ` ${parsed.card_name}` : ""}\n(não descontado do saldo — será cobrado na fatura)\nDívida no crédito: ${formatCurrency(debt)}`;
      } else {
        const balance = await calculateBalance(user.id);
        responseText = `Gasto registrado: ${line} · ${formatPaymentMethodLabel(paymentMethod)}\nSaldo disponível: ${formatCurrency(balance.availableBalance)}`;
      }
      success = true;
      } else {
        responseText = "Não consegui identificar o valor. Quanto foi exatamente?";
        success = true;
      }
    } else if (parsed.intent === "registrar_gasto") {
      const items = extractExpensesFromParsed(parsed);
      const expectedCount = parsed.gastos?.length ?? (parsed.valor !== null ? 1 : 0);
      const needsClarification =
        parsed.precisa_clarificacao ||
        items.length === 0 ||
        (expectedCount > 1 && items.length < expectedCount);

      if (needsClarification) {
        await setPendingContext(user.id, {
          awaiting_value: true,
          partial_description: parsed.descricao ?? undefined,
          partial_category: parsed.categoria ?? undefined,
          partial_expense_date: parsed.expense_date ?? getTodayISO(),
        });
        responseText =
          "Não consegui identificar o valor. Quanto foi exatamente?";
        success = true;
      } else {
        const registered = await registerExpenses(user.id, msg.phone, parsed, source);
        const paymentMethod = parsed.payment_method ?? "dinheiro";

        if (registered.length === 1) {
          const { line, cardName } = registered[0];
          if (paymentMethod === "credito") {
            const debt = (await getCreditDebtByCard(user.id)).reduce(
              (sum, c) => sum + c.total,
              0
            );
            responseText = `Gasto registrado: ${line} · crédito${cardName ? ` ${cardName}` : ""}\n(não descontado do saldo — será cobrado na fatura)\nDívida no crédito: ${formatCurrency(debt)}`;
          } else {
            const balance = await calculateBalance(user.id);
            responseText = `Gasto registrado: ${line} · ${formatPaymentMethodLabel(paymentMethod)}\nSaldo disponível: ${formatCurrency(balance.availableBalance)}`;
          }
        } else {
          const balance = await calculateBalance(user.id);
          responseText = `${registered.length} gastos registrados:\n${registered.map((r) => `• ${r.line}`).join("\n")}\nSaldo disponível: ${formatCurrency(balance.availableBalance)}`;
        }
        success = true;
      }
    } else if (parsed.intent === "registrar_receita") {
      if (parsed.valor === null || parsed.valor <= 0) {
        responseText = "Não consegui identificar o valor da receita. Quanto você recebeu?";
        success = true;
      } else {
        const categoryName = normalizeIncomeCategory(parsed.income_category);
        const category = await getIncomeCategoryByName(categoryName);
        const incomeDate = parsed.expense_date ?? getTodayISO();

        await createIncome({
          userId: user.id,
          amount: parsed.valor,
          categoryId: category.id,
          description: parsed.descricao,
          incomeDate,
          source,
        });

        const balance = await calculateBalance(user.id);
        responseText = `Receita registrada: ${formatCurrency(parsed.valor)} - ${category.icon ?? ""} ${category.name}${parsed.descricao ? ` (${parsed.descricao})` : ""}\nSaldo disponível: ${formatCurrency(balance.availableBalance)}`;
        success = true;
      }
    } else if (parsed.intent === "pagar_fatura") {
      if (parsed.valor === null || parsed.valor <= 0) {
        responseText = "Não consegui identificar o valor do pagamento. Quanto você pagou?";
        success = true;
      } else {
        const paymentDate = parsed.expense_date ?? getTodayISO();
        await createCreditPayment({
          userId: user.id,
          amount: parsed.valor,
          cardName: parsed.card_name,
          paymentDate,
          source,
        });

        const balance = await calculateBalance(user.id);
        const cardSuffix = parsed.card_name ? ` (${parsed.card_name})` : "";
        responseText = `Fatura paga: ${formatCurrency(parsed.valor)}${cardSuffix}\nSaldo disponível: ${formatCurrency(balance.availableBalance)}`;
        success = true;
      }
    } else if (parsed.intent === "consultar_saldo") {
      const balance = await calculateBalance(user.id);
      responseText = formatBalanceSummary(balance);
      success = true;
    } else if (parsed.intent === "consultar_credito") {
      responseText = await formatCreditSummary(user.id);
      success = true;
    } else if (parsed.intent === "atualizar_limite_cartao") {
      if (parsed.valor === null || parsed.valor <= 0) {
        responseText =
          'Informe o novo limite. Ex: "limite do Nubank 5000" ou "atualiza limite Itaú para 3000"';
        success = true;
      } else {
        const cardName =
          parsed.card_name ?? extractCardNameFromText(msg.text);
        if (!cardName) {
          const cards = await getCreditCards(user.id);
          if (cards.length === 0) {
            responseText =
              'Qual cartão? Ex: "limite do Nubank 5000"';
          } else if (cards.length === 1) {
            const { card, created } = await updateCreditCardLimit(
              user.id,
              cards[0].name,
              parsed.valor
            );
            responseText = created
              ? `Cartão ${card.name} cadastrado com limite ${formatCurrency(parsed.valor)}`
              : `Limite do ${card.name} atualizado para ${formatCurrency(parsed.valor)}`;
          } else {
            const list = cards
              .map(
                (c) =>
                  `• ${c.name}: ${formatCurrency(parseAmount(c.credit_limit ?? "0"))}`
              )
              .join("\n");
            responseText = `Qual cartão você quer atualizar? Seus cartões:\n${list}\n\nEx: "limite do Nubank 5000"`;
          }
        } else {
          const { card, created } = await updateCreditCardLimit(
            user.id,
            cardName,
            parsed.valor
          );
          responseText = created
            ? `Cartão ${card.name} cadastrado com limite ${formatCurrency(parsed.valor)}`
            : `Limite do ${card.name} atualizado para ${formatCurrency(parsed.valor)}`;
        }
        success = true;
      }
    } else if (parsed.intent === "consultar_gastos") {
      const period = parsed.periodo ?? "hoje";
      const expenses = await getExpensesForPeriod(user.id, period);

      if (expenses.length === 0) {
        const periodLabel =
          period === "hoje"
            ? "hoje"
            : period === "semana"
              ? "essa semana"
              : "esse mês";
        responseText = `Você não registrou nenhum gasto ${periodLabel}.`;
      } else {
        const total = expenses.reduce(
          (sum, e) => sum + parseAmount(e.amount),
          0
        );
        const periodLabel =
          period === "hoje"
            ? "Hoje"
            : period === "semana"
              ? "Essa semana"
              : "Esse mês";

        const lines = expenses.map(
          (e) =>
            `• ${formatCurrency(parseAmount(e.amount))} - ${e.category_icon ?? ""} ${e.category_name}${e.description ? ` (${e.description})` : ""}`
        );

        responseText = `${periodLabel} você gastou ${formatCurrency(total)}:\n${lines.join("\n")}`;
      }
      success = true;
    } else if (parsed.intent === "consultar_limites") {
      responseText = await getLimitConsultationResponse(
        user.id,
        parsed.periodo,
        user.name
      );
      success = true;
    } else if (parsed.intent === "excluir_ultimo_gasto") {
      const last = await getLastExpense(user.id);
      if (!last) {
        responseText = "Você ainda não tem gastos registrados.";
      } else {
        const deleted = await deleteExpense(last.id, user.id);
        if (!deleted) {
          responseText = "Não consegui excluir o gasto. Tente novamente.";
        } else {
          responseText = `Gasto excluído: ${formatExpenseLine(last.amount, last.category_name, last.description)}`;
        }
      }
      success = true;
    } else if (parsed.intent === "corrigir_ultimo_gasto") {
      const last = await getLastExpense(user.id);
      if (!last) {
        responseText = "Você ainda não tem gastos registrados para corrigir.";
      } else {
        const hasAmount = parsed.valor !== null;
        const hasCategory = parsed.categoria !== null;
        const hasDescription = parsed.descricao !== null;

        if (!hasAmount && !hasCategory && !hasDescription) {
          responseText =
            "O que você quer corrigir no último gasto? Informe o novo valor, categoria ou descrição. Ex: \"corrige para 50 reais\" ou \"muda para transporte\".";
        } else {
          const category = hasCategory
            ? await getCategoryByName(normalizeCategory(parsed.categoria))
            : null;

          const updated = await updateExpense(last.id, user.id, {
            amount: hasAmount ? parsed.valor! : undefined,
            categoryId: category?.id,
            description: hasDescription ? parsed.descricao : undefined,
          });

          if (!updated) {
            responseText = "Não consegui corrigir o gasto. Tente novamente.";
          } else {
            await checkSpendingLimits(
              user.id,
              msg.phone,
              updated.expense_date
            );
            responseText = `Gasto corrigido: ${formatExpenseLine(updated.amount, updated.category_name, updated.description)}`;
          }
        }
      }
      success = true;
    } else if (parsed.intent === "cumprimento") {
      responseText =
        "Olá! 👋 Sou o *Bento*, seu assistente financeiro.\n\nPosso registrar gastos e receitas, consultar saldo, crédito e limites. Ex: \"gastei 30 reais com almoço\" ou \"qual meu saldo?\".";
      success = true;
    } else if (parsed.intent === "fora_contexto") {
      responseText =
        "Não posso responder esse tipo de pergunta. Sou o Bento, seu assistente *financeiro* — posso ajudar a registrar gastos e receitas, consultar saldo, crédito, limites, corrigir ou apagar o último gasto.";
      success = true;
    } else {
      responseText =
        "Não entendi sua mensagem. Posso ajudar com gastos, receitas e saldo. Ex: \"gastei 30 reais com almoço\" ou \"qual meu saldo?\".";
      success = true;
    }
  } catch (err) {
    console.error(`Erro ao processar mensagem de ${msg.phone}:`, err);
    responseText =
      "Desculpe, tive um problema ao processar sua mensagem. Tente novamente em instantes.";
  }

  await respondAndLog(
    user.id,
    msg,
    personalizeMessage(user.name, responseText),
    success,
    {
      inputTokens,
      outputTokens,
      detectedIntent,
      intentSource,
    }
  );
}
