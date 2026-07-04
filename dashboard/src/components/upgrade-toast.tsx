"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const PLAN_LABELS: Record<string, string> = {
  essencial: "Essencial",
  pro: "Pro",
};

export function UpgradeToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [planLabel, setPlanLabel] = useState("Essencial");

  useEffect(() => {
    if (searchParams.get("upgrade") === "success") {
      const plan = searchParams.get("plan") ?? "essencial";
      setPlanLabel(PLAN_LABELS[plan] ?? "Essencial");
      setVisible(true);

      const url = new URL(window.location.href);
      url.searchParams.delete("upgrade");
      url.searchParams.delete("plan");
      router.replace(url.pathname + url.search, { scroll: false });

      const timer = setTimeout(() => setVisible(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-emerald-500/30 bg-emerald-950/90 px-4 py-3 shadow-xl backdrop-blur-sm transition-opacity">
      <p className="text-sm font-medium text-emerald-100">
        Assinatura ativada! Bem-vindo ao plano {planLabel}.
      </p>
    </div>
  );
}
