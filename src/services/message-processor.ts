import { parseMessage } from "./llm-parser.js";
import { sendWhatsAppText } from "./evolution.js";
import { findOrCreateUser } from "../repositories/users.js";
import {
  getCategoryByName,
  normalizeCategory,
} from "../repositories/categories.js";
import {
  createExpense,
  getExpensesForPeriod,
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

export interface IncomingMessage {
  phone: string;
  text: string;
  pushName?: string;
  messageType: string;
}

export async function processMessage(msg: IncomingMessage): Promise<void> {
  const user = await findOrCreateUser(msg.phone, msg.pushName);
  let success = false;
  let responseText = "";

  try {
    const pending = await getPendingContext(user.id);
    const awaitingValue = pending?.awaiting_value === true;

    const parsed = await parseMessage(msg.text, awaitingValue);

    if (awaitingValue && parsed.valor !== null) {
      const amount = parsed.valor;
      const categoryName = normalizeCategory(
        pending?.partial_category ?? parsed.categoria
      );
      const category = await getCategoryByName(categoryName);
      const description =
        pending?.partial_description ?? parsed.descricao ?? null;
      const expenseDate =
        pending?.partial_expense_date ?? parsed.expense_date ?? getTodayISO();

      await createExpense({
        userId: user.id,
        amount,
        categoryId: category.id,
        description,
        expenseDate,
      });

      await setPendingContext(user.id, null);
      responseText = `Gasto registrado: ${formatCurrency(amount)} - ${category.name}${description ? ` (${description})` : ""}`;
      success = true;
    } else if (parsed.intent === "registrar_gasto") {
      if (parsed.precisa_clarificacao || parsed.valor === null) {
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
        const amount = parsed.valor;
        const categoryName = normalizeCategory(parsed.categoria);
        const category = await getCategoryByName(categoryName);
        const expenseDate = parsed.expense_date ?? getTodayISO();

        await createExpense({
          userId: user.id,
          amount,
          categoryId: category.id,
          description: parsed.descricao,
          expenseDate,
        });

        responseText = `Gasto registrado: ${formatCurrency(amount)} - ${category.name}${parsed.descricao ? ` (${parsed.descricao})` : ""}`;
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
    } else {
      responseText =
        "Olá! Sou o Bento, seu assistente financeiro. Posso registrar seus gastos e mostrar quanto você gastou hoje, essa semana ou esse mês. Tente algo como: \"gastei 30 reais com lanche\".";
      success = true;
    }
  } catch (err) {
    console.error(`Erro ao processar mensagem de ${msg.phone}:`, err);
    responseText =
      "Desculpe, tive um problema ao processar sua mensagem. Tente novamente em instantes.";
  }

  await sendWhatsAppText({ phone: msg.phone, text: responseText });

  try {
    await logMessage({
      userId: user.id,
      rawMessage: msg.text,
      messageType: msg.messageType.slice(0, 50),
      processedSuccessfully: success,
    });
  } catch (err) {
    console.error(`Erro ao salvar log da mensagem (${msg.phone}):`, err);
  }
}
