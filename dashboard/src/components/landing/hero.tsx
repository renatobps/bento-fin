import Link from "next/link";
import { ChatMockup } from "@/components/landing/chat-mockup";

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 lg:px-8 lg:py-20">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="mb-5 inline-flex rounded-full border border-bento-gold/30 bg-bento-gold/10 px-3 py-1 text-xs font-medium text-bento-gold">
            Novo: agora com controle de cartão de crédito
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-bento-offwhite sm:text-5xl lg:text-[3.5rem] lg:leading-[1.15]">
            Seu dinheiro sob controle. Direto no WhatsApp.
          </h1>
          <p className="mt-5 max-w-[480px] text-lg leading-relaxed text-bento-offwhite/65">
            Mande uma mensagem, o Bento registra. Sem abrir app, sem planilha, sem login.
            Ele calcula seu saldo real e ainda separa o que é crédito do que já saiu da conta.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-bento-gold px-8 py-3.5 text-base font-semibold text-bento-navy transition hover:bg-bento-gold-dark"
            >
              Começar grátis
            </Link>
            <a
              href="#planos"
              className="inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-base font-medium text-bento-offwhite/80 transition hover:text-bento-gold"
            >
              Ver planos
            </a>
          </div>
          <p className="mt-5 text-sm text-bento-offwhite/50">
            Grátis para sempre até 30 gastos por mês · Sem cartão de crédito
          </p>
        </div>

        <div className="w-full lg:justify-self-end">
          <ChatMockup />
        </div>
      </div>
    </section>
  );
}
