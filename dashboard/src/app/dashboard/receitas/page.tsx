"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { monthQueryString, parseMonthFromSearchParams } from "@/lib/month";

function ReceitasRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const month = parseMonthFromSearchParams(searchParams);

  useEffect(() => {
    router.replace(`/dashboard/transacoes?${monthQueryString(month, { tipo: "entrada" })}`);
  }, [router, month.year, month.month]);

  return (
    <p className="py-20 text-center text-bento-offwhite/40">Redirecionando...</p>
  );
}

export default function ReceitasRedirectPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-bento-offwhite/40">Carregando...</p>}>
      <ReceitasRedirect />
    </Suspense>
  );
}
