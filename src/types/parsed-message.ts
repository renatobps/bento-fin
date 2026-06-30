export type MessageIntent =
  | "registrar_gasto"
  | "consultar_gastos"
  | "fora_contexto"
  | "clarificacao_resposta";

export type ExpensePeriod = "hoje" | "semana" | "mes" | null;

export interface ParsedMessage {
  intent: MessageIntent;
  valor: number | null;
  categoria: string | null;
  descricao: string | null;
  periodo: ExpensePeriod;
  precisa_clarificacao: boolean;
  expense_date: string | null;
}
