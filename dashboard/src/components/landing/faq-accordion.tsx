"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";

const FAQ = [
  {
    q: "O Bento acessa minha conta bancária?",
    a: "Não. O Bento nunca pede senha de banco nem se conecta a instituições financeiras. Você registra manualmente o que quiser, por mensagem.",
  },
  {
    q: "Meus dados financeiros estão seguros?",
    a: "Sim. Os dados são criptografados e armazenados em conformidade com a LGPD. Nunca vendemos ou compartilhamos suas informações.",
  },
  {
    q: "Preciso instalar algum aplicativo?",
    a: "Não. O Bento funciona no WhatsApp que você já usa. O painel web é opcional, acessível pelo navegador.",
  },
  {
    q: "Como funciona o plano gratuito?",
    a: "Você registra até 30 gastos e 10 receitas por mês, sem custo e sem prazo para acabar. Recursos como áudio e cartão de crédito são dos planos pagos.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, sem multa e sem burocracia. Você mantém acesso até o fim do período já pago.",
  },
  {
    q: "O que acontece se eu registrar algo errado?",
    a: "É só pedir para corrigir ou apagar pelo WhatsApp: 'apaga o último gasto' ou 'corrige para 50 reais'.",
  },
  {
    q: "Funciona para mais de uma pessoa?",
    a: "Cada número de WhatsApp tem sua própria conta separada. Casais ou sócios podem usar contas individuais.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState(0);
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = FAQ.length - 1;
    let next = index;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      next = index === last ? 0 : index + 1;
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      next = index === 0 ? last : index - 1;
    } else if (event.key === "Home") {
      event.preventDefault();
      next = 0;
    } else if (event.key === "End") {
      event.preventDefault();
      next = last;
    } else {
      return;
    }

    buttonsRef.current[next]?.focus();
  }

  return (
    <section id="duvidas" className="scroll-mt-24 px-4 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-10 text-center font-display text-3xl font-semibold text-bento-offwhite sm:text-4xl">
          Dúvidas frequentes
        </h2>

        <div className="space-y-3">
          {FAQ.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            const buttonId = `faq-button-${index}`;

            return (
              <div
                key={item.q}
                className="rounded-xl border border-bento-gold/15 bg-bento-navy-muted/60"
              >
                <h3>
                  <button
                    id={buttonId}
                    ref={(el) => {
                      buttonsRef.current[index] = el;
                    }}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium text-bento-offwhite transition hover:text-bento-gold"
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                    onKeyDown={(event) => onKeyDown(event, index)}
                  >
                    {item.q}
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-bento-gold transition-transform duration-200 motion-reduce:transition-none ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!isOpen}
                  className="border-t border-bento-gold/10 px-5 py-4 text-sm leading-relaxed text-bento-offwhite/60"
                >
                  {item.a}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
