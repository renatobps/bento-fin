import { sendWhatsAppText } from "./evolution.js";
import { getTotalForPeriod, type ExpensePeriod } from "../repositories/expenses.js";
import { getUserById } from "../repositories/users.js";
import {
  getSpendingLimits,
  getPeriodKey,
  markLimitNotified,
  wasLimitNotified,
  type SpendingLimits,
} from "../repositories/spending-limits.js";
import { formatCurrency } from "../utils/format.js";
import { getDisplayFirstName, personalizeMessage } from "../utils/user-display.js";

const PERIOD_LABELS: Record<ExpensePeriod, string> = {
  hoje: "diário",
  semana: "semanal",
  mes: "mensal",
};

const PERIOD_DISPLAY: Record<ExpensePeriod, string> = {
  hoje: "hoje",
  semana: "essa semana",
  mes: "esse mês",
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

async function buildFriendlyLimitOpener(
  userName: string | null,
  userId: number,
  period: ExpensePeriod,
  limits: SpendingLimits
): Promise<string | null> {
  const firstName = getDisplayFirstName(userName);
  if (!firstName) return null;

  const limitValue = parseLimit(limits[PERIOD_LIMIT_FIELD[period]]);
  if (limitValue === null) return null;

  const total = await getTotalForPeriod(userId, period);
  const remaining = Math.max(0, limitValue - total);
  const display = PERIOD_DISPLAY[period];

  if (total > limitValue) {
    return `${firstName}, você já passou do limite ${display === "hoje" ? "de hoje" : display}.`;
  }

  return `${firstName}, você ainda pode gastar ${formatCurrency(remaining)} ${display}.`;
}

export async function checkSpendingLimits(
  userId: number,
  phone: string,
  expenseDate: string
): Promise<void> {
  try {
    const limits = await getSpendingLimits(userId);
    if (!limits) return;

    const user = await getUserById(userId);
    const userName = user?.name ?? null;

    for (const period of PERIODS) {
      const limitValue = parseLimit(limits[PERIOD_LIMIT_FIELD[period]]);
      if (limitValue === null) continue;

      const total = await getTotalForPeriod(userId, period, expenseDate);
      if (total <= limitValue) continue;

      // Limite diário: avisa a cada novo gasto. Semanal/mensal: uma vez por período.
      let periodKey: string | undefined;
      if (period !== "hoje") {
        periodKey = await getPeriodKey(period, expenseDate);
        const alreadyNotified = await wasLimitNotified(userId, period, periodKey);
        if (alreadyNotified) continue;
      }

      const label = PERIOD_LABELS[period];
      const text = personalizeMessage(
        userName,
        `⚠️ Limite ${label} ultrapassado!\n\n` +
          `Você gastou ${formatCurrency(total)} de ${formatCurrency(limitValue)} ` +
          `no período ${label === "diário" ? "de hoje" : label === "semanal" ? "desta semana" : "deste mês"}.\n\n` +
          `Ajuste seus limites na dashboard do Bento Finanças.`
      );

      await sendWhatsAppText({ phone, text });

      if (periodKey) {
        await markLimitNotified(userId, period, periodKey);
      }
    }
  } catch (err) {
    console.error(`Erro ao verificar limites de gasto (${phone}):`, err);
  }
}

async function formatPeriodLimitLine(
  userId: number,
  period: ExpensePeriod,
  limits: SpendingLimits
): Promise<string | null> {
  const limitValue = parseLimit(limits[PERIOD_LIMIT_FIELD[period]]);
  if (limitValue === null) return null;

  const total = await getTotalForPeriod(userId, period);
  const remaining = Math.max(0, limitValue - total);
  const over = Math.max(0, total - limitValue);

  const label = PERIOD_LABELS[period];
  const display = PERIOD_DISPLAY[period];

  let text =
    `📊 *Limite ${label}:* ${formatCurrency(limitValue)}\n` +
    `Gasto ${display}: ${formatCurrency(total)}`;

  if (over > 0) {
    text += `\nLimite ultrapassado em ${formatCurrency(over)}`;
  } else {
    text += `\nAinda pode gastar: ${formatCurrency(remaining)}`;
  }

  return text;
}

export async function getLimitConsultationResponse(
  userId: number,
  period: ExpensePeriod | null,
  userName?: string | null
): Promise<string> {
  const limits = await getSpendingLimits(userId);
  if (!limits) {
    return personalizeMessage(
      userName,
      "Você ainda não definiu limites de gasto. Configure na dashboard do Bento Finanças."
    );
  }

  const periods: ExpensePeriod[] = period ? [period] : ["hoje", "semana", "mes"];
  const lines: string[] = [];

  for (const p of periods) {
    const line = await formatPeriodLimitLine(userId, p, limits);
    if (line) lines.push(line);
  }

  if (lines.length === 0) {
    if (period) {
      return personalizeMessage(
        userName,
        `Você ainda não definiu um limite ${PERIOD_LABELS[period]}. Configure na dashboard do Bento Finanças.`
      );
    }
    return personalizeMessage(
      userName,
      "Você ainda não definiu limites de gasto. Configure na dashboard do Bento Finanças."
    );
  }

  const details = lines.join("\n\n");

  if (period) {
    const opener = await buildFriendlyLimitOpener(userName ?? null, userId, period, limits);
    if (opener) {
      return `${opener}\n\n${details}`;
    }
  }

  return personalizeMessage(userName, details);
}
