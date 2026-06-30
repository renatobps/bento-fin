import { sendWhatsAppText } from "./evolution.js";
import { getTotalForPeriod, type ExpensePeriod } from "../repositories/expenses.js";
import {
  getSpendingLimits,
  getPeriodKey,
  markLimitNotified,
  wasLimitNotified,
} from "../repositories/spending-limits.js";
import { formatCurrency } from "../utils/format.js";

const PERIOD_LABELS: Record<ExpensePeriod, string> = {
  hoje: "diário",
  semana: "semanal",
  mes: "mensal",
};

const PERIOD_LIMIT_FIELD: Record<
  ExpensePeriod,
  "daily_limit" | "weekly_limit" | "monthly_limit"
> = {
  hoje: "daily_limit",
  semana: "weekly_limit",
  mes: "monthly_limit",
};

const PERIODS: ExpensePeriod[] = ["hoje", "semana", "mes"];

function parseLimit(value: string | null): number | null {
  if (value === null) return null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function checkSpendingLimits(
  userId: number,
  phone: string,
  expenseDate: string
): Promise<void> {
  try {
    const limits = await getSpendingLimits(userId);
    if (!limits) return;

    for (const period of PERIODS) {
      const limitValue = parseLimit(limits[PERIOD_LIMIT_FIELD[period]]);
      if (limitValue === null) continue;

      const total = await getTotalForPeriod(userId, period, expenseDate);
      if (total <= limitValue) continue;

      const periodKey = await getPeriodKey(period, expenseDate);
      const alreadyNotified = await wasLimitNotified(userId, period, periodKey);
      if (alreadyNotified) continue;

      const label = PERIOD_LABELS[period];
      const text =
        `⚠️ Limite ${label} ultrapassado!\n\n` +
        `Você gastou ${formatCurrency(total)} de ${formatCurrency(limitValue)} ` +
        `no período ${label === "diário" ? "de hoje" : label === "semanal" ? "desta semana" : "deste mês"}.\n\n` +
        `Ajuste seus limites na dashboard do Bento Finanças.`;

      await sendWhatsAppText({ phone, text });
      await markLimitNotified(userId, period, periodKey);
    }
  } catch (err) {
    console.error(`Erro ao verificar limites de gasto (${phone}):`, err);
  }
}
