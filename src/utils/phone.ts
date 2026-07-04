const BRAZIL_COUNTRY = "55";

// Sempre armazenar com o dígito 9 — o WhatsApp pode entregar JIDs com ou sem ele,
// e normalizar para o formato com 9 evita duplicatas.

/** Normaliza para 55 + DDD + 9 dígitos (celular brasileiro com nono dígito). */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");

  if (digits.startsWith(BRAZIL_COUNTRY)) {
    digits = digits.slice(2);
  }

  if (digits.length < 10) {
    return BRAZIL_COUNTRY + digits;
  }

  const ddd = digits.slice(0, 2);
  let local = digits.slice(2);

  // Celular brasileiro: 8 dígitos (ex: 9859-5681) ou 9 dígitos (ex: 99859-5681).
  // Números antigos de 8 dígitos podem começar com 9 — sempre prefixar mais um 9.
  if (local.length === 8) {
    local = "9" + local;
  }

  if (local.length === 9 && local.startsWith("9")) {
    return BRAZIL_COUNTRY + ddd + local;
  }

  return BRAZIL_COUNTRY + ddd + local;
}

export function isValidBrazilPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return /^55\d{11}$/.test(normalized);
}

export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizePhone(phone);
  const local = normalized.slice(2);
  const ddd = local.slice(0, 2);
  const number = local.slice(2);

  if (number.length === 9) {
    return `+55 (${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
  }

  return `+55 (${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
}
