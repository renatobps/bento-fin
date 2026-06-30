export function formatLocalPhoneInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

/** Formata DDD + número (10 ou 11 dígitos, com ou sem o 9 extra) */
export function formatPhoneDisplay(localDigits: string): string {
  const digits = localDigits.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
}

/** Valida 10 ou 11 dígitos locais (DDD + número) */
export function isValidLocalPhone(digits: string): boolean {
  const len = digits.replace(/\D/g, "").length;
  return len === 10 || len === 11;
}
