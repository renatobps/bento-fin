import type { ParsedMessage } from "../types/parsed-message.js";
import { extractCardNameFromText } from "./card-name.js";
import { normalizeForMatching } from "./financial-keywords.js";

const CURRENCY_SUFFIX =
  /(?:reais?|real|contos?|pal(?:a)?|pila|pau|tao(?:s)?|barao(?:es)?)/i;

function parseBrazilianNumber(raw: string): number | null {
  let s = raw.trim();
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Extrai valor monetário de frases coloquiais: "200 reais", "100 conto", "100 pal", "R$50", "gastei 30". */
export function extractAmountFromText(text: string): number | null {
  const normalized = text.trim();
  if (!normalized) return null;

  const rsMatch = normalized.match(
    /R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/i
  );
  if (rsMatch) return parseBrazilianNumber(rsMatch[1]);

  const suffixMatch = normalized.match(
    new RegExp(`(\\d+(?:[.,]\\d{1,2})?)\\s*${CURRENCY_SUFFIX.source}`, "i")
  );
  if (suffixMatch) return parseBrazilianNumber(suffixMatch[1]);

  const verbMatch = normalized.match(
    /\b(?:gastei|paguei|comprei|ganhei|recebi|gasto|de)\s+(\d+(?:[.,]\d{1,2})?)\b/i
  );
  if (verbMatch) return parseBrazilianNumber(verbMatch[1]);

  const aloneMatch = normalized.match(
    /^[^\d]*(\d+(?:[.,]\d{1,2})?)\s*(?:reais?|real|contos?|pal(?:a)?|pila)?\s*$/i
  );
  if (aloneMatch) return parseBrazilianNumber(aloneMatch[1]);

  return null;
}

export function detectPaymentMethod(
  text: string
): ParsedMessage["payment_method"] {
  const n = normalizeForMatching(text);

  if (/\b(credito|cartao|parcela|parcelado|parcel)\b/.test(n)) {
    return "credito";
  }
  if (/\bdebito\b/.test(n)) {
    return "debito";
  }
  if (/\bpix\b/.test(n)) {
    return "pix";
  }
  if (/\b(dinheiro|especie|cash)\b/.test(n)) {
    return "dinheiro";
  }

  return null;
}

const SPEND_VERB = /\b(gastei|paguei|comprei)\b/i;
const INCOME_VERB = /\b(ganhei|recebi|entrou|caiu)\b/i;
const FATURA_VERB = /\b(paguei|quitei|quitar)\b.*\b(fatura|credito|cartao)\b/i;
const CARD_LIMIT_VERB =
  /\b(atualiz|mud|alter|muda|troc|defin|configur)\b.*\blimite\b/i;
const CARD_LIMIT_PHRASE =
  /\blimite\b.*\b(cartao|cartão|credito|crédito)\b/i;

/** Preenche valor/método/intent ausentes com heurísticas locais. */
export function enrichParsedFromText(
  parsed: ParsedMessage,
  text: string
): ParsedMessage {
  const enriched: ParsedMessage = { ...parsed };
  const amount = extractAmountFromText(text);
  const paymentMethod = detectPaymentMethod(text);

  if (SPEND_VERB.test(text) && amount !== null) {
    enriched.intent = "registrar_gasto";
    enriched.valor = enriched.valor ?? amount;
    enriched.precisa_clarificacao = false;
  } else if (INCOME_VERB.test(text) && amount !== null) {
    enriched.intent = "registrar_receita";
    enriched.valor = enriched.valor ?? amount;
    enriched.precisa_clarificacao = false;
  } else if (FATURA_VERB.test(text) && amount !== null) {
    enriched.intent = "pagar_fatura";
    enriched.valor = enriched.valor ?? amount;
    enriched.precisa_clarificacao = false;
  } else if (
    amount !== null &&
    (CARD_LIMIT_VERB.test(text) ||
      CARD_LIMIT_PHRASE.test(text) ||
      (/\blimite\b/i.test(text) && extractCardNameFromText(text) !== null))
  ) {
    enriched.intent = "atualizar_limite_cartao";
    enriched.valor = enriched.valor ?? amount;
    enriched.card_name = enriched.card_name ?? extractCardNameFromText(text);
    enriched.precisa_clarificacao = false;
  } else if (
    amount !== null &&
    (enriched.intent === "registrar_gasto" ||
      enriched.intent === "registrar_receita" ||
      enriched.intent === "pagar_fatura" ||
      enriched.intent === "atualizar_limite_cartao" ||
      enriched.intent === "clarificacao_resposta" ||
      enriched.intent === "corrigir_ultimo_gasto")
  ) {
    enriched.valor = enriched.valor ?? amount;
  }

  if (enriched.intent === "registrar_gasto") {
    enriched.payment_method = enriched.payment_method ?? paymentMethod;
    if (enriched.valor !== null && enriched.valor > 0) {
      enriched.precisa_clarificacao = false;
    }
  }

  if (enriched.intent === "atualizar_limite_cartao") {
    enriched.card_name = enriched.card_name ?? extractCardNameFromText(text);
  }

  if (enriched.intent === "clarificacao_resposta" && amount !== null) {
    enriched.valor = amount;
    enriched.precisa_clarificacao = false;
  }

  return enriched;
}
