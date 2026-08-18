import Link from "next/link";

// TODO: substituir SOCIAL_PROOF_COUNT por número real quando tiver base
const SOCIAL_PROOF_COUNT: number | null = null;

export function FinalCta() {
  const socialProof = SOCIAL_PROOF_COUNT
    ? `Já são ${SOCIAL_PROOF_COUNT.toLocaleString("pt-BR")} pessoas organizando as finanças com o Bento`
    : "Junte-se a quem já organiza as finanças com o Bento";

  return (
    <section className="px-4 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-4xl rounded-3xl border border-bento-gold/25 bg-gradient-to-b from-bento-gold/15 via-bento-navy-muted to-bento-navy px-6 py-14 text-center sm:px-12">
        <h2 className="font-display text-3xl font-semibold text-bento-offwhite sm:text-4xl">
          Comece a controlar seus gastos hoje
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-bento-offwhite/65">
          Grátis para sempre. Sem cartão de crédito. Leva menos de 1 minuto.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-bento-gold px-10 py-4 text-lg font-semibold text-bento-navy transition hover:bg-bento-gold-dark"
        >
          Começar grátis no WhatsApp
        </Link>
        <p className="mt-4 text-sm text-bento-offwhite/45">{socialProof}</p>
      </div>
    </section>
  );
}
