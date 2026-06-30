import { parseMessage } from "./llm-parser.js";
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
import { checkSpendingLimits } from "./spending-limit-checker.js";

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

export async function processMessage(msg: IncomingMessage): Promise<void> {
  const user = await findOrCreateUser(msg.phone, msg.pushName);
  let success = false;
  let responseText = "";
  const source = msg.source ?? "text";

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
        source,
      });

      await checkSpendingLimits(user.id, msg.phone, expenseDate);

      await setPendingContext(user.id, null);
      responseText = `Gasto registrado: ${formatExpenseLine(amount, category.name, description)}`;
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
          source,
        });

        await checkSpendingLimits(user.id, msg.phone, expenseDate);

        responseText = `Gasto registrado: ${formatExpenseLine(amount, category.name, parsed.descricao)}`;
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
    } else if (parsed.intent === "excluir_ultimo_gasto") {
      const last = await getLastExpense(user.id);
      if (!last) {
        responseText = "Você ainda não tem gastos registrados.";
      } else {
        await deleteExpense(last.id, user.id);
        responseText = `Gasto excluído: ${formatExpenseLine(last.amount, last.category_name, last.description)}`;
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
    } else {
      responseText =
        "Olá! Sou o Bento, seu assistente financeiro. Posso registrar gastos, consultar quanto você gastou, corrigir ou excluir o último gasto. Tente: \"gastei 30 reais com lanche\" ou \"apaga o último gasto\".";
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
