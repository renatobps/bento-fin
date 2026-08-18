"use client";

import Link from "next/link";
import type { BillingInterval, PlanDefinition } from "@/lib/plans";
import { formatPlanPrice, PLANS, yearlyDiscountPercent } from "@/lib/plans";
import type { SubscriptionInfo } from "@/lib/api";
import { formatPlanRenewalHint } from "@/components/current-plan-summary";

interface PricingCardProps {
  plan: PlanDefinition;
  interval: BillingInterval;
  currentPlan?: string;
  subscription?: SubscriptionInfo | null;
  loading?: boolean;
  onSubscribe?: (planId: "essencial" | "pro") => void;
  onManage?: () => void;
}

export function PricingCard({
  plan,
  interval,
  currentPlan,
  subscription,
  loading = false,
  onSubscribe,
  onManage,
}: PricingCardProps) {
  const price = interval === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  const isCurrent = currentPlan === plan.id;
  const renewalHint =
    isCurrent && subscription ? formatPlanRenewalHint(subscription) : null;
  const discount =
    interval === "yearly" && plan.monthlyPrice > 0
      ? yearlyDiscountPercent(plan.monthlyPrice, plan.yearlyPrice)
      : 0;

  function renderCta() {
    if (plan.id === "free") {
      return (
        <Link
          href="/login"
          className="block w-full rounded-xl border border-bento-gold/30 py-3 text-center text-sm font-semibold text-bento-offwhite transition hover:border-bento-gold hover:text-bento-gold"
        >
          Começar grátis
        </Link>
      );
    }

    if (isCurrent) {
      return (
        <button
          type="button"
          onClick={onManage}
          disabled={loading}
          className="w-full rounded-xl border border-bento-gold/40 py-3 text-sm font-semibold text-bento-gold transition hover:bg-bento-gold/10 disabled:opacity-50"
        >
          {loading ? "Abrindo..." : "Gerenciar assinatura"}
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => onSubscribe?.(plan.id as "essencial" | "pro")}
        disabled={loading}
        className={`w-full rounded-xl py-3 text-sm font-semibold transition disabled:opacity-50 ${
          plan.highlighted
            ? "bg-bento-gold text-bento-navy hover:bg-bento-gold-dark"
            : "border border-bento-gold/30 text-bento-offwhite hover:border-bento-gold hover:text-bento-gold"
        }`}
      >
        {loading ? "Redirecionando..." : "Assinar"}
      </button>
    );
  }

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 ${
        plan.highlighted
          ? "border-bento-gold/50 bg-bento-navy-muted shadow-lg shadow-bento-gold/10"
          : "border-bento-gold/15 bg-bento-navy-muted/60"
      }`}
    >
      {plan.highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-bento-gold px-3 py-0.5 text-xs font-semibold text-bento-navy">
          Mais popular
        </span>
      )}

      {isCurrent && (
        <span className="mb-2 inline-block w-fit rounded-full border border-bento-gold/30 px-2 py-0.5 text-xs text-bento-gold">
          Plano atual
        </span>
      )}

      <h3 className="font-display text-xl text-bento-offwhite">{plan.name}</h3>
      <p className="mt-1 text-sm text-bento-offwhite/50">{plan.description}</p>

      {renewalHint && (
        <p className="mt-3 rounded-lg border border-bento-gold/15 bg-bento-gold/5 px-3 py-2 text-xs text-bento-offwhite/75">
          {renewalHint}
        </p>
      )}

      <div className="my-6">
        <p className="font-display text-3xl text-bento-gold">
          {formatPlanPrice(price, interval)}
        </p>
        {discount > 0 && (
          <p className="mt-1 text-xs text-emerald-400">
            Economize {discount}% no plano anual
          </p>
        )}
        {plan.id === "free" && (
          <p className="mt-1 text-xs text-bento-offwhite/40">Para sempre</p>
        )}
      </div>

      <ul className="mb-8 flex-1 space-y-2.5">
        {plan.features.map((feature) => (
          <li
            key={feature.text}
            className={`flex items-start gap-2 text-sm ${
              feature.included ? "text-bento-offwhite/80" : "text-bento-offwhite/30"
            }`}
          >
            <span className="mt-0.5 shrink-0">
              {feature.included ? "✓" : "—"}
            </span>
            {feature.text}
          </li>
        ))}
      </ul>

      {renderCta()}
    </div>
  );
}

interface PricingToggleProps {
  interval: BillingInterval;
  onChange: (interval: BillingInterval) => void;
}

export function PricingToggle({ interval, onChange }: PricingToggleProps) {
  return (
    <div className="inline-flex rounded-xl border border-bento-gold/20 bg-bento-navy-muted p-1">
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
          interval === "monthly"
            ? "bg-bento-gold text-bento-navy"
            : "text-bento-offwhite/60 hover:text-bento-offwhite"
        }`}
      >
        Mensal
      </button>
      <button
        type="button"
        onClick={() => onChange("yearly")}
        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition sm:px-5 ${
          interval === "yearly"
            ? "bg-bento-gold text-bento-navy"
            : "text-bento-offwhite/60 hover:text-bento-offwhite"
        }`}
      >
        Anual
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
            interval === "yearly"
              ? "bg-bento-navy text-bento-gold"
              : "bg-bento-gold/15 text-bento-gold"
          }`}
        >
          2 meses grátis
        </span>
      </button>
    </div>
  );
}

interface PricingGridProps {
  interval: BillingInterval;
  currentPlan?: string;
  subscription?: SubscriptionInfo | null;
  loadingPlan?: string | null;
  onSubscribe: (planId: "essencial" | "pro") => void;
  onManage: () => void;
}

export function PricingGrid({
  interval,
  currentPlan,
  subscription,
  loadingPlan,
  onSubscribe,
  onManage,
}: PricingGridProps) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {PLANS.map((plan) => (
        <PricingCard
          key={plan.id}
          plan={plan}
          interval={interval}
          currentPlan={currentPlan}
          subscription={subscription}
          loading={loadingPlan === plan.id}
          onSubscribe={onSubscribe}
          onManage={onManage}
        />
      ))}
    </div>
  );
}
