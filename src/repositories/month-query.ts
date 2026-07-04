export interface MonthRange {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
}

export function parseMonthQuery(
  yearRaw: unknown,
  monthRaw: unknown
): MonthRange | null {
  const year = parseInt(String(yearRaw ?? ""), 10);
  const month = parseInt(String(monthRaw ?? ""), 10);

  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  if (month < 1 || month > 12) return null;

  const lastDay = new Date(year, month, 0).getDate();
  const monthStr = String(month).padStart(2, "0");

  return {
    year,
    month,
    startDate: `${year}-${monthStr}-01`,
    endDate: `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function getCurrentMonthRange(): MonthRange {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return parseMonthQuery(year, month)!;
}
