import {
  BENTO_NO_BUTTON_ID,
  BENTO_YES_BUTTON_ID,
} from "../services/evolution.js";

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Interpreta resposta SIM/NÃO (texto ou clique em botão). */
export function parseYesNoResponse(text: string | null | undefined): "yes" | "no" | null {
  if (!text?.trim()) return null;

  const trimmed = text.trim();
  const n = normalize(trimmed);

  if (
    n === "sim" ||
    trimmed === "SIM" ||
    trimmed === BENTO_YES_BUTTON_ID
  ) {
    return "yes";
  }

  if (
    n === "nao" ||
    trimmed === "NÃO" ||
    trimmed === BENTO_NO_BUTTON_ID
  ) {
    return "no";
  }

  if (/\bsim\b/i.test(trimmed)) return "yes";
  if (/\bn[aã]o\b/i.test(trimmed)) return "no";

  return null;
}

export function isYesResponse(text: string | null | undefined): boolean {
  return parseYesNoResponse(text) === "yes";
}

export function isNoResponse(text: string | null | undefined): boolean {
  return parseYesNoResponse(text) === "no";
}

/** Normaliza clique em botão para texto legível pelo fluxo. */
export function normalizeButtonReply(
  buttonId?: string,
  displayText?: string
): string | null {
  if (displayText?.trim()) {
    return displayText.trim();
  }

  if (buttonId === BENTO_YES_BUTTON_ID) return "sim";
  if (buttonId === BENTO_NO_BUTTON_ID) return "não";

  // IDs genéricos que algumas versões da Evolution enviam
  if (buttonId?.toLowerCase() === "yes" || buttonId?.toLowerCase() === "sim") {
    return "sim";
  }
  if (buttonId?.toLowerCase() === "no" || buttonId?.toLowerCase() === "nao") {
    return "não";
  }

  return buttonId ?? null;
}
