"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { PricingGrid, PricingToggle } from "@/components/pricing-card";
import { createCheckout } from "@/lib/api";
import type { BillingInterval } from "@/lib/plans";
import { getToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

const STEPS = [
  {
    title: "Envie uma mensagem",
    description: "Mande um áudio ou texto no WhatsApp: \"gastei 30 reais com almoço\".",
    icon: "💬",
  },
  {
    title: "Bento registra",
    description: "A IA categoriza automaticamente e atualiza seu saldo em tempo real.",
    icon: "🤖",
  },
  {
    title: "Veja no dashboard",
    description: "Acompanhe gastos, receitas, cartões e limites na web.",
    icon: "📊",
  },
];

const FAQ = [
  {
    q: "Meus dados estão seguros?",
    a: "Sim. Seus dados ficam em banco PostgreSQL com acesso autenticado. O pagamento é processado pelo Stripe — nunca armazenamos dados de cartão.",
  },
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sim. Cancele pelo portal de assinatura e mantenha acesso até o fim do período pago.",
  },
  {
    q: "Preciso instalar algum app?",
    a: "Não. Use o WhatsApp que você já tem. O dashboard web é opcional para visualização.",
  },
  {
    q: "Funciona com qualquer banco?",
    a: "Sim. Você registra manualmente via WhatsApp — não precisamos de integração bancária.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = useCallback(
    async (planId: "essencial" | "pro") => {
      const token = getToken();
      if (!token) {
        router.push(`/login?redirect=${encodeURIComponent("/planos")}`);
        return;
      }
      setLoadingPlan(planId);
      try {
        const { checkoutUrl } = await createCheckout(token, planId, interval);
        window.location.href = checkoutUrl;
      } catch {
        router.push("/planos");
      }
    },
    [interval, router]
  );

  const handleManage = useCallback(() => {
    router.push("/planos");
  }, [router]);

  return (
    <div className="min-h-full bg-bento-navy">
      <header className="border-b border-bento-gold/10 px-4 py-5 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <BrandLogo size="sm" />
          <nav className="flex items-center gap-4">
            <Link href="/planos" className="hidden text-sm text-bento-offwhite/60 transition hover:text-bento-gold sm:block">
              Planos
            </Link>
            {getToken() ? (
              <Link
                href="/dashboard"
                className="rounded-lg border border-bento-gold/30 px-4 py-2 text-sm font-medium text-bento-gold transition hover:bg-bento-gold/10"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-bento-gold px-4 py-2 text-sm font-semibold text-bento-navy transition hover:bg-bento-gold-dark"
              >
                Entrar
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center lg:px-8 lg:py-24">
        <BrandLogo size="lg" className="mx-auto mb-8" priority />
        <h1 className="font-display text-4xl leading-tight text-bento-offwhite sm:text-5xl lg:text-6xl">
          Controle seus gastos
          <br />
          <span className="text-bento-gold">pelo WhatsApp</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-bento-offwhite/60">
          Registre gastos e receitas por mensagem ou áudio. Veja tudo organizado no dashboard.
          Simples como mandar um zap.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/login"
            className="rounded-xl bg-bento-gold px-8 py-3.5 text-base font-semibold text-bento-navy transition hover:bg-bento-gold-dark"
          >
            Começar grátis
          </Link>
          <Link
            href="/planos"
            className="rounded-xl border border-bento-gold/30 px-8 py-3.5 text-base font-medium text-bento-offwhite transition hover:border-bento-gold hover:text-bento-gold"
          >
            Ver planos
          </Link>
        </div>
      </section>

      {/* Como funciona */}
      <section className="border-y border-bento-gold/10 bg-bento-navy-muted/40 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <h2 className="mb-12 text-center font-display text-2xl text-bento-offwhite sm:text-3xl">
            Como funciona
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-bento-gold/10 text-2xl">
                  {step.icon}
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-bento-gold">
                  Passo {i + 1}
                </span>
                <h3 className="mt-2 font-display text-lg text-bento-offwhite">{step.title}</h3>
                <p className="mt-2 text-sm text-bento-offwhite/55">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section className="py-16 lg:py-20" id="planos">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="font-display text-2xl text-bento-offwhite sm:text-3xl">Planos</h2>
            <p className="mt-3 text-bento-offwhite/60">
              Comece grátis. Faça upgrade quando precisar de mais.
            </p>
            <div className="mt-8 flex justify-center">
              <PricingToggle interval={interval} onChange={setInterval} />
            </div>
          </div>
          <PricingGrid
            interval={interval}
            loadingPlan={loadingPlan}
            onSubscribe={handleSubscribe}
            onManage={handleManage}
          />
        </div>
      </section>

      {/* Depoimentos */}
      <section className="border-y border-bento-gold/10 bg-bento-navy-muted/40 py-16">
        <div className="mx-auto max-w-6xl px-4 text-center lg:px-8">
          <h2 className="font-display text-2xl text-bento-offwhite sm:text-3xl">
            O que dizem nossos beta testers
          </h2>
          <p className="mt-8 text-bento-offwhite/40">
            Depoimentos de usuários reais em breve.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <h2 className="mb-10 text-center font-display text-2xl text-bento-offwhite sm:text-3xl">
            Perguntas frequentes
          </h2>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-bento-gold/15 bg-bento-navy-muted/60"
              >
                <summary className="cursor-pointer px-5 py-4 font-medium text-bento-offwhite transition group-open:text-bento-gold">
                  {item.q}
                </summary>
                <p className="border-t border-bento-gold/10 px-5 py-4 text-sm text-bento-offwhite/60">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-bento-gold/10 px-4 py-8 text-center text-sm text-bento-offwhite/40">
        <p>© {new Date().getFullYear()} Bento Finanças</p>
      </footer>
    </div>
  );
}
