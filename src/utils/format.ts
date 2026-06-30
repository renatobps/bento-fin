import { getTodayISO as todayInSaoPaulo } from "./timezone.js";
import { normalizePhone } from "./phone.js";

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function extractPhoneFromJid(remoteJid: string): string {
  const raw = remoteJid.split("@")[0].replace(/\D/g, "");
  return normalizePhone(raw);
}

export function getTodayISO(): string {
  return todayInSaoPaulo();
}

export function parseAmount(value: string | number): number {
  if (typeof value === "number") return value;
  return parseFloat(value);
}
