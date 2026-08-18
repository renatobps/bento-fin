import {
  Bell,
  CreditCard,
  LayoutDashboard,
  Mic,
  ShieldOff,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Wallet,
    title: "Saldo real, não só histórico",
    description:
      "Outros apps só listam gastos. O Bento calcula quanto você ainda tem disponível agora, somando receitas e subtraindo o que já saiu da conta.",
  },
  {
    icon: CreditCard,
    title: "Crédito separado do saldo",
    description:
      "Comprou no cartão? Não desconta do seu saldo — entra na fatura. Quando você paga a fatura, aí sim sai da conta. Do jeito que funciona de verdade.",
  },
  {
    icon: Mic,
    title: "Texto ou áudio, você escolhe",
    description: "Sem tempo de digitar? Manda um áudio. O Bento transcreve e registra igual.",
  },
  {
    icon: LayoutDashboard,
    title: "Painel web completo",
    description:
      "Gráficos por categoria, evolução mensal, filtros por período e método de pagamento. Tudo sincronizado com o WhatsApp.",
  },
  {
    icon: Bell,
    title: "Alertas que fazem sentido",
    description:
      "Defina limites por categoria e receba aviso antes de estourar. Lembrete de vencimento de fatura também.",
  },
  {
    icon: ShieldOff,
    title: "Sem conexão bancária",
    description:
      "Não pedimos senha do banco, não acessamos sua conta. Você registra o que quiser, do jeito que quiser.",
  },
];

export function FeaturesGrid() {
  return (
    <section
      id="recursos"
      className="scroll-mt-24 border-y border-bento-gold/10 bg-bento-navy-muted/40 px-4 py-16 lg:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-semibold text-bento-offwhite sm:text-4xl">
            O que só o Bento faz
          </h2>
          <p className="mt-3 text-bento-offwhite/60">
            Controle financeiro que entende como você realmente gasta
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-bento-gold/15 bg-bento-navy/50 p-6 transition duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-bento-gold/35 hover:shadow-lg hover:shadow-bento-gold/5 motion-reduce:transform-none"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-bento-gold/10 text-bento-gold">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="font-display text-lg text-bento-offwhite">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-bento-offwhite/60">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
