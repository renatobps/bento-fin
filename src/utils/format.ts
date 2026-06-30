export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function extractPhoneFromJid(remoteJid: string): string {
  return remoteJid.split("@")[0].replace(/\D/g, "");
}

export function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseAmount(value: string | number): number {
  if (typeof value === "number") return value;
  return parseFloat(value);
}
