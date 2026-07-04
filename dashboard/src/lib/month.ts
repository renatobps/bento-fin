const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export interface MonthRef {
  year: number;
  month: number;
}

export function getCurrentMonth(): MonthRef {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function formatMonthLabel({ year, month }: MonthRef): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function parseMonthFromSearchParams(
  params: URLSearchParams
): MonthRef {
  const year = parseInt(params.get("year") ?? "", 10);
  const month = parseInt(params.get("month") ?? "", 10);
  if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
    return { year, month };
  }
  return getCurrentMonth();
}

export function monthQueryString(
  { year, month }: MonthRef,
  extra?: Record<string, string>
): string {
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      params.set(key, value);
    }
  }
  return params.toString();
}
