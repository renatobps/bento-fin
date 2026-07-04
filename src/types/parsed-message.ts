export type MessageIntent =
  | "registrar_gasto"
  | "registrar_receita"
  | "pagar_fatura"
  | "consultar_gastos"
  | "consultar_saldo"
  | "consultar_credito"
  | "consultar_limites"
  | "atualizar_limite_cartao"
  | "excluir_ultimo_gasto"
  | "corrigir_ultimo_gasto"
  | "cumprimento"
  | "fora_contexto"
  | "clarificacao_resposta";

export type IntentSource = "prefilter" | "llm" | "confidence_fallback";

export type ExpensePeriod = "hoje" | "semana" | "mes" | null;

export interface ParsedExpenseItem {
  valor: number;
  categoria: string | null;
  descricao: string | null;
  expense_date?: string | null;
}

export interface ParsedIncomeItem {
  valor: number;
  income_category: string | null;
  descricao: string | null;
  expense_date?: string | null;
}

export interface ParsedMessage {
  intent: MessageIntent;
  valor: number | null;
  categoria: string | null;
  descricao: string | null;
  periodo: ExpensePeriod;
  precisa_clarificacao: boolean;
  expense_date: string | null;
  confianca?: number;
  /** Múltiplos gastos na mesma mensagem. Quando preenchido, ignore valor/categoria/descricao. */
  gastos?: ParsedExpenseItem[] | null;
  /** Múltiplas receitas na mesma mensagem. Quando preenchido, ignore valor/income_category/descricao. */
  receitas?: ParsedIncomeItem[] | null;
  payment_method: "dinheiro" | "pix" | "debito" | "credito" | null;
  card_name: string | null;
  income_category: string | null;
}

export function extractExpensesFromParsed(parsed: ParsedMessage): ParsedExpenseItem[] {
  if (parsed.gastos && parsed.gastos.length > 0) {
    return parsed.gastos.filter(
      (item) => typeof item.valor === "number" && item.valor > 0
    );
  }

  if (parsed.valor !== null && parsed.valor > 0) {
    return [
      {
        valor: parsed.valor,
        categoria: parsed.categoria,
        descricao: parsed.descricao,
        expense_date: parsed.expense_date,
      },
    ];
  }

  return [];
}

export function extractIncomesFromParsed(parsed: ParsedMessage): ParsedIncomeItem[] {
  if (parsed.receitas && parsed.receitas.length > 0) {
    return parsed.receitas.filter(
      (item) => typeof item.valor === "number" && item.valor > 0
    );
  }

  if (parsed.valor !== null && parsed.valor > 0) {
    return [
      {
        valor: parsed.valor,
        income_category: parsed.income_category,
        descricao: parsed.descricao,
        expense_date: parsed.expense_date,
      },
    ];
  }

  return [];
}
