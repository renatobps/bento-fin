"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0d1117] p-6 text-white">
        <h2 className="text-lg font-semibold">Algo deu errado</h2>
        <p className="max-w-md text-center text-sm text-white/60">
          {error.message || "Erro inesperado ao carregar a página."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
