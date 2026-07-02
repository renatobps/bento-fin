import type { ParsedMessage } from "../types/parsed-message.js";
import {
  hasFinancialContext,
  normalizeForMatching,
} from "../utils/financial-keywords.js";

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

  if (isGreeting(trimmed)) {
    return emptyParsed("cumprimento");
  }

  if (trimmed.includes("?") && !hasFinancialContext(trimmed)) {
    return emptyParsed("fora_contexto");
  }

  return null;
}
