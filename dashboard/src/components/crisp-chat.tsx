"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Crisp } from "crisp-sdk-web";
import { getToken, getUser } from "@/lib/auth";
import { fetchSubscription } from "@/lib/api";

function syncCrispUser(): void {
  const user = getUser();
  if (user?.phone) {
    Crisp.user.setPhone(user.phone);
  }
  if (user?.email) {
    Crisp.user.setEmail(user.email);
  }
  if (user?.name) {
    Crisp.user.setNickname(user.name);
  }

  const token = getToken();
  if (!token) return;

  fetchSubscription(token)
    .then((sub) => {
      Crisp.session.setData({
        plano: sub.plan,
        status: sub.status,
      });
    })
    .catch(() => {});
}

function CrispChat() {
  const pathname = usePathname();
  const configured = useRef(false);

  useEffect(() => {
    const websiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
    if (!websiteId) return;

    if (!configured.current) {
      Crisp.configure(websiteId);
      Crisp.session.onLoaded(() => syncCrispUser());
      configured.current = true;
    }

    syncCrispUser();
  }, [pathname]);

  return null;
}

export function CrispProvider() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  if (!process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID) {
    return null;
  }

  return <CrispChat />;
}
