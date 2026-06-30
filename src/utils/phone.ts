const BRAZIL_COUNTRY = "55";

/** Normaliza para o formato do WhatsApp: 55 + DDD + 8 dígitos (sem o 9 extra do celular) */
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

  // Celular com 9 a mais após o DDD: 998595681 → 98595681 (padrão WhatsApp)
  if (local.length === 9 && local.startsWith("9")) {
    local = local.slice(1);
  }

  // Aceita também 10 dígitos locais onde o primeiro já é o 9 do celular (98595681)
  return BRAZIL_COUNTRY + ddd + local;
}

export function isValidBrazilPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  const localLen = digits.startsWith(BRAZIL_COUNTRY)
    ? digits.length - 2
    : digits.length;
  if (localLen !== 10 && localLen !== 11) return false;
  return /^55\d{10}$/.test(normalizePhone(phone));
}

export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizePhone(phone);
  const local = normalized.slice(2);
  const ddd = local.slice(0, 2);
  const number = local.slice(2);
  return `+55 (${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
}
