const ROWS = [
  {
    feature: "Onde registrar",
    traditional: "Abrir app, achar botão, digitar",
    bento: "Manda mensagem no WhatsApp",
  },
  {
    feature: "Registro por áudio",
    traditional: "❌",
    bento: "✅",
  },
  {
    feature: "Saldo disponível real",
    traditional: "Só histórico de gastos",
    bento: "Calculado em tempo real",
  },
  {
    feature: "Crédito vs débito",
    traditional: "Tudo junto",
    bento: "Separado corretamente",
  },
  {
    feature: "Precisa de login",
    traditional: "Toda vez",
    bento: "Nunca, já está no WhatsApp",
  },
  {
    feature: "Curva de aprendizado",
    traditional: "Precisa aprender a usar",
    bento: "Escreve como fala",
  },
];

export function ComparisonTable() {
  return (
    <section className="px-4 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 text-center font-display text-3xl font-semibold text-bento-offwhite sm:text-4xl">
          Por que não uma planilha ou app tradicional?
        </h2>

        <div className="space-y-3 md:hidden">
          {ROWS.map((row) => (
            <article
              key={row.feature}
              className="rounded-2xl border border-bento-gold/15 bg-bento-navy-muted/50 p-4"
            >
              <h3 className="font-medium text-bento-offwhite">{row.feature}</h3>
              <p className="mt-2 text-sm text-bento-offwhite/45">
                Apps tradicionais: {row.traditional}
              </p>
              <p className="mt-1 text-sm font-medium text-bento-gold">Bento: {row.bento}</p>
            </article>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-bento-gold/15 md:block">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Comparativo entre apps tradicionais e o Bento
            </caption>
            <thead className="bg-bento-navy-muted/80">
              <tr>
                <th scope="col" className="px-5 py-4 font-medium text-bento-offwhite/70">
                  Recurso
                </th>
                <th scope="col" className="px-5 py-4 font-medium text-bento-offwhite/70">
                  Apps tradicionais
                </th>
                <th
                  scope="col"
                  className="bg-bento-gold/10 px-5 py-4 font-semibold text-bento-gold"
                >
                  Bento
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.feature} className="border-t border-bento-gold/10">
                  <th
                    scope="row"
                    className="px-5 py-4 font-medium text-bento-offwhite"
                  >
                    {row.feature}
                  </th>
                  <td className="px-5 py-4 text-bento-offwhite/55">
                    {row.traditional === "❌" ? (
                      <span aria-label="Não disponível">❌</span>
                    ) : (
                      row.traditional
                    )}
                  </td>
                  <td className="bg-bento-gold/10 px-5 py-4 font-medium text-bento-offwhite">
                    {row.bento === "✅" ? <span aria-label="Disponível">✅</span> : row.bento}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
