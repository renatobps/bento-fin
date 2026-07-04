"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  formatMonthLabel,
  getCurrentMonth,
  monthQueryString,
  parseMonthFromSearchParams,
  shiftMonth,
} from "@/lib/month";

interface MonthNavigatorProps {
  basePath: string;
  extraParams?: Record<string, string>;
}

export function MonthNavigator({ basePath, extraParams }: MonthNavigatorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = parseMonthFromSearchParams(searchParams);

  function navigate(month: { year: number; month: number }) {
    router.push(`${basePath}?${monthQueryString(month, extraParams)}`);
  }

  const isCurrentMonth =
    current.year === getCurrentMonth().year &&
    current.month === getCurrentMonth().month;

  return (
    <div className="mb-6 flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => navigate(shiftMonth(current, -1))}
        className="text-emerald-400 transition hover:text-emerald-300"
        aria-label="Mês anterior"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => !isCurrentMonth && navigate(getCurrentMonth())}
        className={`rounded-full border px-5 py-2 text-sm font-medium transition ${
          isCurrentMonth
            ? "border-emerald-500/60 text-emerald-400"
            : "border-bento-gold/30 text-bento-offwhite hover:border-emerald-500/40"
        }`}
      >
        {formatMonthLabel(current)}
      </button>

      <button
        type="button"
        onClick={() => navigate(shiftMonth(current, 1))}
        className="text-emerald-400 transition hover:text-emerald-300"
        aria-label="Próximo mês"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
