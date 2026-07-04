"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Crisp } from "crisp-sdk-web";
import { getToken, getUser } from "@/lib/auth";
import { fetchSubscription } from "@/lib/api";

function CrispChat() {
  useEffect(() => {
    const websiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
    if (!websiteId) return;

    Crisp.configure(websiteId);

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
    if (token) {
      fetchSubscription(token)
        .then((sub) => {
          Crisp.session.setData({
            plano: sub.plan,
            status: sub.status,
          });
        })
        .catch(() => {});
    }
  }, []);

  return null;
}

export function CrispProvider() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return <CrispChat />;
}
