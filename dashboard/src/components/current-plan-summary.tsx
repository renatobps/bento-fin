"use client";

import type { SubscriptionInfo } from "@/lib/api";
import { PLANS } from "@/lib/plans";

const TZ = "America/Sao_Paulo";

function formatBillingDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function intervalLabel(interval: SubscriptionInfo["billingInterval"]): string | null {
  if (interval === "monthly") return "Mensal";
  if (interval === "yearly") return "Anual";
  return null;
}

function renewalMessage(subscription: SubscriptionInfo): string | null {
  if (subscription.plan === "free") {
    return "Sem cobrança recorrente.";
  }

  if (!subscription.expiresAt) {
    return null;
  }

  const date = formatBillingDate(subscription.expiresAt);
  const cycle = intervalLabel(subscription.billingInterval);

  if (subscription.status === "canceled") {
    return `Acesso válido até ${date}.`;
  }

  if (subscription.status === "past_due") {
    return `Pagamento pendente — vencimento em ${date}.`;
  }

  if (cycle === "Anual") {
    return `Próxima cobrança anual em ${date}.`;
  }

  if (cycle === "Mensal") {
    return `Próximo pagamento mensal em ${date}.`;
  }

  return `Próxima cobrança em ${date}.`;
}

interface CurrentPlanSummaryProps {
  subscription: SubscriptionInfo;
  onManage?: () => void;
  managing?: boolean;
}

export function CurrentPlanSummary({
  subscription,
  onManage,
  managing = false,
}: CurrentPlanSummaryProps) {
  const planName =
    PLANS.find((plan) => plan.id === subscription.plan)?.name ?? subscription.plan;
  const cycle = intervalLabel(subscription.billingInterval);
  const renewal = renewalMessage(subscription);
  const isPaid = subscription.plan !== "free";

  return (
    <div className="mb-8 rounded-2xl border border-bento-gold/20 bg-bento-navy-muted p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-bento-offwhite/50">Plano atual</p>
          <p className="mt-1 font-display text-2xl text-bento-offwhite">
            {planName}
            {cycle && (
              <span className="ml-2 text-base font-normal text-bento-gold">
                · {cycle}
              </span>
            )}
          </p>
          {renewal && (
            <p className="mt-2 text-sm text-bento-offwhite/70">{renewal}</p>
          )}
          {subscription.status === "canceled" && isPaid && (
            <p className="mt-1 text-xs text-amber-400/90">
              Assinatura cancelada — você mantém acesso até a data acima.
            </p>
          )}
        </div>

        {isPaid && onManage && (
          <button
            type="button"
            onClick={onManage}
            disabled={managing}
            className="shrink-0 rounded-xl border border-bento-gold/30 px-5 py-2.5 text-sm font-semibold text-bento-gold transition hover:bg-bento-gold/10 disabled:opacity-50"
          >
            {managing ? "Abrindo..." : "Gerenciar assinatura"}
          </button>
        )}
      </div>
    </div>
  );
}

export function formatPlanRenewalHint(subscription: SubscriptionInfo): string | null {
  return renewalMessage(subscription);
}
