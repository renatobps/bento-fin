import type { ParsedMessage } from "../types/parsed-message.js";
import {
  hasFinancialContext,
  normalizeForMatching,
} from "../utils/financial-keywords.js";
import {
  extractAmountFromText,
} from "../utils/amount-parser.js";
import { extractCardNameFromText } from "../utils/card-name.js";

const GREETING_PATTERN =
  /^(oi|ola|hey|salve|e ai|bom dia|boa tarde|boa noite|tudo bem|opa|hi|hello|fala)(\s+bento)?$/;

function emptyParsed(
  intent: ParsedMessage["intent"],
  confianca = 1
): ParsedMessage {
  return {
    intent,
    valor: null,
    categoria: null,
    descricao: null,
    periodo: null,
    precisa_clarificacao: false,
    expense_date: null,
    confianca,
    payment_method: null,
    card_name: null,
    income_category: null,
  };
}

function isGreeting(text: string): boolean {
  if (hasFinancialContext(text)) return false;

  const normalized = normalizeForMatching(text)
    .replace(/[!?.,"']/g, "")
    .trim();

  return GREETING_PATTERN.test(normalized);
}

/** Classificação rápida sem IA. Retorna null se a mensagem deve ir para o LLM. */
export function prefilterIntent(
  text: string,
  pendingClarification: boolean
): ParsedMessage | null {
  if (pendingClarification) return null;

  const trimmed = text.trim();
  if (!trimmed) {
    return emptyParsed("fora_contexto");
  }

  const normalized = normalizeForMatching(trimmed);
  const normalizedExact = normalized.replace(/[!?.,"']/g, "").trim();

  const HELP_PATTERN =
    /\b(ajuda|socorro|suporte|help|nao entendo|nao sei|como funciona|como uso|como faco|nao consigo)\b/;
  const HELP_EXACT = new Set([
    "ajuda",
    "help",
    "suporte",
    "oi",
    "ola",
    "menu",
  ]);

  if (
    HELP_PATTERN.test(normalized) ||
    HELP_EXACT.has(normalizedExact) ||
    normalizedExact === "olá"
  ) {
    return emptyParsed("solicitar_ajuda", 0.95);
  }

  if (isGreeting(trimmed)) {
    return emptyParsed("cumprimento");
  }

  if (trimmed.includes("?") && !hasFinancialContext(trimmed)) {
    return emptyParsed("fora_contexto");
  }

  const amount = extractAmountFromText(trimmed);

  // Gastos e receitas vão para o LLM — precisa extrair categoria e descrição
  // (ex: "gastei 5 com token" ou "comprei 123 em carne").

  const isCardLimitUpdate =
    amount !== null &&
    (/\b(atualiz|mud|alter|muda|troc|defin)\b.*\blimite\b/i.test(normalized) ||
      /\blimite\b.*\b(cartao|credito)\b/i.test(normalized) ||
      (/\blimite\b/i.test(normalized) && extractCardNameFromText(trimmed) !== null));

  if (isCardLimitUpdate) {
    return {
      ...emptyParsed("atualizar_limite_cartao", 0.95),
      valor: amount,
      card_name: extractCardNameFromText(trimmed),
    };
  }

  if (
    /\b(qual|quanto|ver|mostra|exibe)\b.*\bsaldo\b/.test(normalized) ||
    /\bsaldo\b.*\b(atual|disponivel|hoje)\b/.test(normalized) ||
    normalized === "saldo"
  ) {
    return emptyParsed("consultar_saldo", 0.95);
  }

  if (
    /\b(quanto|qual|ver)\b.*\b(devo|divida|debito)\b.*\b(credito|cartao)\b/.test(
      normalized
    ) ||
    /\b(total|valor)\b.*\b(credito|fatura)\b/.test(normalized)
  ) {
    return emptyParsed("consultar_credito", 0.95);
  }

  if (/\b(quanto|o que)\b.*\bgastei\b.*\b(hoje|semana|mes|esse|essa)\b/.test(normalized)) {
    let periodo: "hoje" | "semana" | "mes" = "hoje";
    if (/\bsemana\b/.test(normalized)) periodo = "semana";
    else if (/\b(mes|mês)\b/.test(normalized)) periodo = "mes";
    return { ...emptyParsed("consultar_gastos", 0.95), periodo };
  }

  if (/\b(apaga|exclu|remove|deleta|desfaz)\b.*\b(ultimo|gasto|lancamento)\b/.test(normalized)) {
    return emptyParsed("excluir_ultimo_gasto", 0.95);
  }

  if (
    amount !== null &&
    /\b(paguei|quitei|pago)\b.*\b(fatura|credito|cartao)\b/.test(normalized)
  ) {
    return {
      ...emptyParsed("pagar_fatura", 0.95),
      valor: amount,
      card_name: extractCardNameFromText(trimmed),
    };
  }

  return null;
}
