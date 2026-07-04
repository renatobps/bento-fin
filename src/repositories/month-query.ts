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

import { TZ } from "../utils/timezone.js";

export function getCurrentMonthRange(): MonthRange {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = parseInt(parts.find((p) => p.type === "year")?.value ?? "0", 10);
  const month = parseInt(parts.find((p) => p.type === "month")?.value ?? "1", 10);
  return parseMonthQuery(year, month)!;
}
