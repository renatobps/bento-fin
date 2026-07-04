"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreditoRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/cartoes");
  }, [router]);

  return (
    <p className="py-20 text-center text-bento-offwhite/40">Redirecionando...</p>
  );
}
