// TODO: SUBSTITUIR POR DEPOIMENTOS REAIS DO BETA (com autorização)
const TESTIMONIALS = [
  {
    name: "Ana",
    age: 34,
    quote: "Eu nunca conseguia manter uma planilha. Agora só mando mensagem e pronto.",
  },
  {
    name: "Carlos",
    age: 41,
    quote: "O melhor é saber quanto ainda posso gastar no mês sem fazer conta.",
  },
  {
    name: "Juliana",
    age: 28,
    quote: "Uso o áudio quando estou dirigindo. Registro na hora, não esqueço mais.",
  },
];

export function Testimonials() {
  return (
    <section className="border-y border-bento-gold/10 bg-bento-navy-muted/40 px-4 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 text-center font-display text-3xl font-semibold text-bento-offwhite sm:text-4xl">
          Quem usa, recomenda
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <figure
              key={item.name}
              className="rounded-2xl border border-bento-gold/15 bg-bento-navy/50 p-6 transition duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-bento-gold/35 motion-reduce:transform-none"
            >
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-bento-gold/15 font-display text-lg text-bento-gold"
                  aria-hidden="true"
                >
                  {item.name.charAt(0)}
                </div>
                <figcaption className="text-sm font-medium text-bento-offwhite">
                  {item.name}, {item.age}
                </figcaption>
              </div>
              <blockquote className="text-sm leading-relaxed text-bento-offwhite/70">
                “{item.quote}”
              </blockquote>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
