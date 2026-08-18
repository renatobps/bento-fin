"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { PricingGrid, PricingToggle } from "@/components/pricing-card";
import { createCheckout } from "@/lib/api";
import type { BillingInterval } from "@/lib/plans";
import { getToken } from "@/lib/auth";

export function PlansSection() {
  const router = useRouter();
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = useCallback(
    async (planId: "essencial" | "pro") => {
      const token = getToken();
      if (!token) {
        router.push(`/login?redirect=${encodeURIComponent("/planos")}`);
        return;
      }
      setLoadingPlan(planId);
      try {
        const { checkoutUrl } = await createCheckout(token, planId, interval);
        window.location.href = checkoutUrl;
      } catch {
        router.push("/planos");
      }
    },
    [interval, router]
  );

  const handleManage = useCallback(() => {
    router.push("/planos");
  }, [router]);

  return (
    <section id="planos" className="scroll-mt-24 px-4 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl font-semibold text-bento-offwhite sm:text-4xl">
            Escolha seu plano
          </h2>
          <p className="mt-3 text-bento-offwhite/60">
            Comece grátis. Faça upgrade quando precisar.
          </p>
          <div className="mt-8 flex justify-center">
            <PricingToggle interval={interval} onChange={setInterval} />
          </div>
        </div>

        <PricingGrid
          interval={interval}
          loadingPlan={loadingPlan}
          onSubscribe={handleSubscribe}
          onManage={handleManage}
        />

        <p className="mt-8 text-center text-sm text-bento-offwhite/40">
          Cancele quando quiser, sem multa. Seus dados continuam seus.
        </p>
      </div>
    </section>
  );
}
