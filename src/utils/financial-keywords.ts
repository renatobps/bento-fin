import type { MessageIntent } from "../types/parsed-message.js";

export const FINANCIAL_KEYWORDS = [
  "gastei",
  "gasto",
  "gastos",
  "paguei",
  "pague",
  "comprei",
  "reais",
  "real",
  "r$",
  "limite",
  "limites",
  "orçamento",
  "orcamento",
  "despesa",
  "despesas",
  "quanto gastei",
  "quanto gaste",
  "posso gastar",
  "ainda posso",
  "quanto falta",
  "quanto sobrou",
  "corrige",
  "corrigir",
  "corrig",
  "apaga",
  "apagar",
  "excluir",
  "desfazer",
  "remover",
  "último",
  "ultimo",
  "financeir",
  "dinheiro",
  "valor",
  "conta",
  "parcela",
  "cartão",
  "cartao",
  "pix",
  "transferi",
  "transferência",
  "transferencia",
  "saldo",
  "economiz",
  "investi",
  "ganhei",
  "recebi",
  "entrada",
  "fatura",
  "credito",
  "crédito",
  "debito",
  "débito",
  "conto",
  "contos",
  "pal",
  "pila",
  "nubank",
  "itau",
  "itaú",
  "inter",
  "bradesco",
  "santander",
  "c6",
];

const FINANCIAL_INTENTS = new Set<MessageIntent>([
  "registrar_gasto",
  "registrar_receita",
  "pagar_fatura",
  "consultar_gastos",
  "consultar_saldo",
  "consultar_credito",
  "consultar_limites",
  "atualizar_limite_cartao",
  "excluir_ultimo_gasto",
  "corrigir_ultimo_gasto",
  "clarificacao_resposta",
]);

export function normalizeForMatching(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function hasFinancialContext(text: string): boolean {
  const normalized = normalizeForMatching(text);
  return FINANCIAL_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function isFinancialIntent(intent: MessageIntent): boolean {
  return FINANCIAL_INTENTS.has(intent);
}
