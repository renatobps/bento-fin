import { Lock, Mic, Zap, type LucideIcon } from "lucide-react";

type TrustItem =
  | { icon: LucideIcon; label: string }
  | { icon: null; emoji: string; label: string };

const ITEMS: TrustItem[] = [
  { icon: Lock, label: "Nunca pedimos senha do banco" },
  { icon: null, emoji: "🇧🇷", label: "Dados no Brasil, conforme LGPD" },
  { icon: Zap, label: "Resposta em segundos" },
  { icon: Mic, label: "Funciona por texto ou áudio" },
];

export function TrustBar() {
  return (
    <section
      aria-label="Sinais de confiança"
      className="border-y border-bento-gold/10 bg-bento-navy-muted/50"
    >
      <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-5 lg:grid-cols-4 lg:px-8">
        {ITEMS.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-2.5 text-sm text-bento-offwhite/75"
          >
            {item.icon ? (
              <item.icon className="h-4 w-4 shrink-0 text-bento-gold" aria-hidden="true" />
            ) : (
              <span aria-hidden="true">{item.emoji}</span>
            )}
            {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
