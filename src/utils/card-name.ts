import { normalizeForMatching } from "./financial-keywords.js";

const KNOWN_CARDS: Readonly<Record<string, string>> = {
  nubank: "Nubank",
  itau: "Itaú",
  inter: "Inter",
  bradesco: "Bradesco",
  santander: "Santander",
  c6: "C6",
  caixa: "Caixa",
  bb: "BB",
  "banco do brasil": "Banco do Brasil",
  picpay: "PicPay",
  neon: "Neon",
  next: "Next",
  xp: "XP",
};

/** Extrai nome do cartão/banco mencionado na mensagem. */
export function extractCardNameFromText(text: string): string | null {
  const normalized = normalizeForMatching(text);

  for (const [key, display] of Object.entries(KNOWN_CARDS)) {
    if (normalized.includes(key)) {
      return display;
    }
  }

  const patterns = [
    /\b(?:cart[aã]o|cartao)\s+([A-Za-zÀ-ú0-9]+)/i,
    /\b(?:do|da|no|na)\s+([A-Za-zÀ-ú0-9]+)\s+(?:para|de|é|:|\d)/i,
    /\blimite\s+(?:do|da)\s+([A-Za-zÀ-ú0-9]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const raw = match[1].trim();
      const skip = new Set([
        "limite",
        "limit",
        "cartao",
        "cartão",
        "credito",
        "crédito",
        "para",
        "de",
      ]);
      if (!skip.has(normalizeForMatching(raw))) {
        return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      }
    }
  }

  return null;
}
