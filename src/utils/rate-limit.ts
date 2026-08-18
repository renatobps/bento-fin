import type { Request } from "express";

interface Entry {
  count: number;
  resetAt: number;
}

/**
 * Contador de tentativas em memória com expiração por chave.
 *
 * Vale por instância: com várias réplicas cada uma mantém sua própria
 * contagem. Para limites rígidos, migrar para Redis.
 */
export class RateLimiter {
  private readonly entries = new Map<string, Entry>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number
  ) {}

  private prune(now: number): void {
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }
  }

  /** true quando ainda há tentativas disponíveis para a chave. */
  allows(key: string): boolean {
    const now = Date.now();
    const entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) return true;
    return entry.count < this.limit;
  }

  record(key: string): void {
    const now = Date.now();
    if (this.entries.size > 10_000) this.prune(now);

    const entry = this.entries.get(key);
    if (entry && entry.resetAt > now) {
      entry.count += 1;
      return;
    }
    this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
  }

  reset(key: string): void {
    this.entries.delete(key);
  }
}

/**
 * IP do cliente. Depende de `app.set("trust proxy", ...)` para que o Express
 * só aceite `X-Forwarded-For` do proxy configurado — sem isso o header é
 * forjável e qualquer limite por IP vira decorativo.
 */
export function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}
