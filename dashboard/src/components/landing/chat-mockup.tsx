"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const MESSAGES = [
  { from: "user" as const, text: "gastei 45 no almoço" },
  {
    from: "bot" as const,
    text: "Gasto registrado: R$45,00 · 🍔 alimentação\nSaldo disponível: R$1.955,00",
  },
  { from: "user" as const, text: "paguei 320 no mercado no crédito" },
  {
    from: "bot" as const,
    text: "Gasto registrado: R$320,00 · 🛒 mercado · crédito Nubank\n(não descontado do saldo — entra na fatura)\nDívida no crédito: R$520,00",
  },
  { from: "user" as const, text: "qual meu saldo?" },
  {
    from: "bot" as const,
    text: "💰 Saldo disponível: R$1.955,00\nReceitas: R$3.000,00\nGastos: R$1.045,00",
  },
];

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function TypingIndicator() {
  return (
    <div
      className="landing-msg flex w-fit items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-3 py-2.5 shadow-sm"
      aria-hidden="true"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="landing-dot h-1.5 w-1.5 rounded-full bg-neutral-400"
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
    </div>
  );
}

export function ChatMockup() {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
  const [visibleCount, setVisibleCount] = useState(0);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;

    let cancelled = false;

    async function play() {
      while (!cancelled) {
        await wait(500);
        if (cancelled) return;

        for (let i = 0; i < MESSAGES.length; i++) {
          if (cancelled) return;

          if (MESSAGES[i].from === "bot") {
            setTyping(true);
            await wait(600);
            if (cancelled) return;
            setTyping(false);
          }

          setVisibleCount(i + 1);
          if (i < MESSAGES.length - 1) {
            await wait(800);
          }
        }

        await wait(4000);
        if (cancelled) return;
        setVisibleCount(0);
        setTyping(false);
      }
    }

    void play();
    return () => {
      cancelled = true;
    };
  }, [reducedMotion]);

  const visible = MESSAGES.slice(0, reducedMotion ? MESSAGES.length : visibleCount);

  return (
    <div
      className="mx-auto w-full max-w-[420px] overflow-hidden rounded-3xl border border-bento-gold/20 shadow-2xl shadow-black/40"
      aria-live="off"
      aria-hidden="true"
    >
      <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white">
          B
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Bento</p>
          <p className="text-xs text-emerald-100/80">online</p>
        </div>
      </div>

      <div className="flex min-h-[460px] flex-col gap-2 bg-[#ece5dd] px-3 py-4">
        {visible.map((message, index) => (
          <div
            key={`${message.text}-${index}`}
            className={`landing-msg max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-[13px] leading-relaxed text-neutral-800 shadow-sm ${
              message.from === "user"
                ? "ml-auto rounded-br-sm bg-[#d9fdd3]"
                : "mr-auto rounded-bl-sm bg-white"
            }`}
          >
            {message.text}
          </div>
        ))}
        {typing && !reducedMotion && <TypingIndicator />}
      </div>
    </div>
  );
}
