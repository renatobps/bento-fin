const STEPS = [
  {
    number: "01",
    title: "Mande uma mensagem",
    description:
      "Escreva ou grave um áudio: 'gastei 30 no Uber'. Sem formato específico, fale do seu jeito.",
  },
  {
    number: "02",
    title: "O Bento entende e registra",
    description:
      "A IA identifica valor, categoria e se foi crédito, débito, pix ou dinheiro. Tudo automático.",
  },
  {
    number: "03",
    title: "Veja tudo organizado",
    description:
      "Consulte pelo WhatsApp ou acesse o painel web com gráficos, saldo e relatórios completos.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-24 px-4 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-semibold text-bento-offwhite sm:text-4xl">
            Simples assim
          </h2>
          <p className="mt-3 text-bento-offwhite/60">
            Do primeiro gasto ao relatório completo em menos de um minuto
          </p>
        </div>

        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <li
              key={step.number}
              className="rounded-2xl border border-bento-gold/15 bg-bento-navy-muted/60 p-6 transition duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-bento-gold/35 hover:shadow-lg hover:shadow-bento-gold/5 motion-reduce:transform-none"
            >
              <span className="font-display text-sm font-semibold tracking-widest text-bento-gold">
                {step.number}
              </span>
              <h3 className="mt-3 font-display text-xl text-bento-offwhite">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-bento-offwhite/60">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
