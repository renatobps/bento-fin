"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { PricingGrid, PricingToggle } from "@/components/pricing-card";
import { createCheckout, fetchSubscription, openPortal } from "@/lib/api";
import type { BillingInterval } from "@/lib/plans";
import { getToken } from "@/lib/auth";

export default function PlanosPage() {
  const router = useRouter();
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [currentPlan, setCurrentPlan] = useState<string | undefined>();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    fetchSubscription(token)
      .then((sub) => setCurrentPlan(sub.plan))
      .catch(() => {});
  }, []);

  const handleSubscribe = useCallback(
    async (planId: "essencial" | "pro") => {
      setError("");
      const token = getToken();
      if (!token) {
        router.push(`/login?redirect=${encodeURIComponent("/planos")}`);
        return;
      }

      setLoadingPlan(planId);
      try {
        const { checkoutUrl } = await createCheckout(token, planId, interval);
        window.location.href = checkoutUrl;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao iniciar checkout");
        setLoadingPlan(null);
      }
    },
    [interval, router]
  );

  const handleManage = useCallback(async () => {
    setError("");
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setLoadingPlan("manage");
    try {
      const { portalUrl } = await openPortal(token);
      window.location.href = portalUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao abrir portal");
      setLoadingPlan(null);
    }
  }, [router]);

  return (
    <div className="min-h-full bg-bento-navy">
      <header className="border-b border-bento-gold/10 px-4 py-5 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/">
            <BrandLogo size="sm" />
          </Link>
          <div className="flex items-center gap-3">
            {getToken() ? (
              <Link
                href="/dashboard"
                className="text-sm text-bento-offwhite/60 transition hover:text-bento-gold"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-bento-gold px-4 py-2 text-sm font-semibold text-bento-navy transition hover:bg-bento-gold-dark"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
        <div className="mb-10 text-center">
          <h1 className="font-display text-3xl text-bento-offwhite sm:text-4xl">
            Escolha seu plano
          </h1>
          <p className="mt-3 text-bento-offwhite/60">
            Comece grátis e faça upgrade quando quiser. Cancele a qualquer momento.
          </p>
          <div className="mt-8 flex justify-center">
            <PricingToggle interval={interval} onChange={setInterval} />
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <PricingGrid
          interval={interval}
          currentPlan={currentPlan}
          loadingPlan={loadingPlan}
          onSubscribe={handleSubscribe}
          onManage={handleManage}
        />
      </main>
    </div>
  );
}
