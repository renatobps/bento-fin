"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchSubscription } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { getSupportEmail } from "@/lib/crisp";

export function PastDueBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    fetchSubscription(token)
      .then((sub) => setShow(sub.status === "past_due"))
      .catch(() => {});
  }, []);

  if (!show) return null;

  const email = getSupportEmail();

  return (
    <div className="border-b border-red-500/40 bg-red-950/90 px-4 py-3 text-center text-sm text-red-100 lg:px-6">
      Seu pagamento está pendente — acesse{" "}
      <Link href="/planos" className="font-semibold underline hover:text-white">
        Gerenciar assinatura
      </Link>{" "}
      ou entre em contato:{" "}
      <a href={`mailto:${email}`} className="font-semibold underline hover:text-white">
        {email}
      </a>
    </div>
  );
}
