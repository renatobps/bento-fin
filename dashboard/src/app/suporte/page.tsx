"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { openCrispChat, getSupportEmail, getSupportWhatsAppUrl } from "@/lib/crisp";

const FAQ = [
  {
    q: "Como registro um gasto ou receita?",
    a: 'Envie uma mensagem descrevendo o valor e o que foi. Exemplos: "gastei 45 reais no almoço", "recebi 1000 de salário". O Bento identifica categoria e método automaticamente.',
  },
  {
    q: "Como consulto meu saldo e extrato?",
    a: 'Pergunte no WhatsApp: "quanto gastei hoje?", "quanto gastei esse mês?" ou "qual meu saldo?". Você também vê tudo detalhado no dashboard após fazer login.',
  },
  {
    q: "Como gerencio minha assinatura?",
    a: "Acesse Meu plano no dashboard ou a página de planos. Lá você pode fazer upgrade, cancelar ou abrir o portal de cobrança do Stripe.",
  },
  {
    q: "O bot não entendeu minha mensagem. O que faço?",
    a: 'Seja mais específico com o valor ("gastei 30 reais"), mencione o método ("no crédito", "no pix") e, para receitas, comece com "recebi" ou "ganhei". Se persistir, envie um e-mail com o exemplo da mensagem.',
  },
  {
    q: "Como falo com a equipe de suporte?",
    a: "Use o chat ao vivo nesta página, envie um e-mail ou mande \"ajuda\" no WhatsApp do Bento para ver o menu de autoatendimento.",
  },
];

function MessageIcon() {
  return (
    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function SuportePage() {
  const supportEmail = getSupportEmail();

  const cards = [
    {
      title: "Chat ao vivo",
      description: "Resposta em até 4h no horário comercial",
      icon: <MessageIcon />,
      onClick: () => openCrispChat(),
    },
    {
      title: "E-mail",
      description: "Resposta em até 24 horas úteis",
      icon: <MailIcon />,
      href: `mailto:${supportEmail}`,
    },
    {
      title: "WhatsApp",
      description: "Envie \"ajuda\" para o Bento",
      icon: <WhatsAppIcon />,
      href: getSupportWhatsAppUrl(),
      external: true,
    },
  ];

  return (
    <div className="min-h-screen bg-bento-navy">
      <header className="border-b border-bento-gold/10 px-4 py-5 lg:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/">
            <BrandLogo size="sm" />
          </Link>
          <Link
            href="/login"
            className="text-sm text-bento-offwhite/60 transition hover:text-bento-gold"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 lg:px-8">
        <h1 className="font-display text-3xl text-bento-offwhite sm:text-4xl">
          Como podemos ajudar?
        </h1>
        <p className="mt-3 text-bento-offwhite/60">
          Escolha o canal que preferir. Estamos aqui para ajudar.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {cards.map((card) => {
            const className =
              "flex flex-col items-start rounded-2xl border border-bento-gold/15 bg-bento-navy-muted/60 p-6 text-left transition hover:border-bento-gold/40 hover:bg-bento-navy-muted";

            if (card.href) {
              return (
                <a
                  key={card.title}
                  href={card.href}
                  target={card.external ? "_blank" : undefined}
                  rel={card.external ? "noopener noreferrer" : undefined}
                  className={className}
                >
                  <span className="text-bento-gold">{card.icon}</span>
                  <h2 className="mt-4 font-display text-lg text-bento-offwhite">{card.title}</h2>
                  <p className="mt-2 text-sm text-bento-offwhite/55">{card.description}</p>
                </a>
              );
            }

            return (
              <button key={card.title} type="button" onClick={card.onClick} className={className}>
                <span className="text-bento-gold">{card.icon}</span>
                <h2 className="mt-4 font-display text-lg text-bento-offwhite">{card.title}</h2>
                <p className="mt-2 text-sm text-bento-offwhite/55">{card.description}</p>
              </button>
            );
          })}
        </div>

        <section className="mt-16">
          <h2 className="font-display text-2xl text-bento-offwhite">Perguntas frequentes</h2>
          <div className="mt-6 space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-bento-gold/15 bg-bento-navy-muted/60"
              >
                <summary className="cursor-pointer px-5 py-4 font-medium text-bento-offwhite transition group-open:text-bento-gold">
                  {item.q}
                </summary>
                <p className="border-t border-bento-gold/10 px-5 py-4 text-sm leading-relaxed text-bento-offwhite/60">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-bento-gold/10 px-4 py-8 text-center text-sm text-bento-offwhite/40">
        <p>© {new Date().getFullYear()} Bento Finanças</p>
      </footer>
    </div>
  );
}
