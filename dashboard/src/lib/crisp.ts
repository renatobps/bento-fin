import { Crisp } from "crisp-sdk-web";

declare global {
  interface Window {
    $crisp?: unknown[];
  }
}

export function openCrispChat(): void {
  if (typeof window === "undefined") return;

  try {
    if (window.$crisp) {
      window.$crisp.push(["do", "chat:open"]);
      return;
    }
    Crisp.chat.open();
  } catch {
    // Widget não configurado
  }
}

export function getSupportEmail(): string {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "suporte@bento.com.br";
}

export function getSupportWhatsAppUrl(): string {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "5561996690313";
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent("ajuda")}`;
}
