/** Mascara telefone para exibição no admin (LGPD). */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 8) return digits;
  return (
    digits.slice(0, 4) +
    digits.slice(4, -4).replace(/\d/g, "*") +
    digits.slice(-4)
  );
}
