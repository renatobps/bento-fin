/**
 * URL base da API.
 *
 * `NEXT_PUBLIC_API_URL` sempre vence: em produção a API fica em outro host
 * (ex.: https://api.dominio.com.br) atrás do proxy, e não na porta 3000 do
 * mesmo hostname do dashboard.
 *
 * O fallback por hostname existe só para desenvolvimento, quando se acessa o
 * dashboard pelo IP da rede local e a API responde na 3000 da mesma máquina.
 */
export function resolveApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/+$/, "");

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${protocol}//${hostname}:3000`;
    }
  }

  return "http://localhost:3000";
}
