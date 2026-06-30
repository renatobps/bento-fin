export const TZ = "America/Sao_Paulo";

export function getTodayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Converte DATE do Postgres (string ou Date UTC) para YYYY-MM-DD */
export function formatDateOnly(value: string | Date): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, "0");
  const d = String(value.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Interpreta timestamp sem fuso do Postgres como horário de São Paulo (UTC-3) */
export function pgTimestampToISO(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const normalized = value.trim().replace(" ", "T");
  const hasOffset = /[zZ]|[+-]\d{2}:\d{2}$/.test(normalized);
  if (hasOffset) {
    return new Date(normalized).toISOString();
  }

  return new Date(`${normalized}-03:00`).toISOString();
}

export function toISOString(value: string | Date): string {
  return pgTimestampToISO(value);
}

export function formatDateTimeSaoPaulo(value: string | Date): string {
  const iso = typeof value === "string" ? value : pgTimestampToISO(value);
  const date = iso.includes("T") && /[zZ]|[+-]\d{2}:\d{2}$/.test(iso)
    ? new Date(iso)
    : new Date(pgTimestampToISO(iso));
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatTimeSaoPaulo(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDateSaoPaulo(value: string | Date): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10))) {
    const [, y, m, d] = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)!;
    return `${d}/${m}/${y}`;
  }

  const date = typeof value === "string" ? new Date(pgTimestampToISO(value)) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
