"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { clearSession, getToken, getUser } from "@/lib/auth";

interface DashboardShellProps {
  title: string;
  children: React.ReactNode;
}

export function DashboardShell({ title, children }: DashboardShellProps) {
  const router = useRouter();
  const [userPhone, setUserPhone] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setUserPhone(getUser()?.phone ?? "");
  }, [router]);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-full bg-bento-navy">
      <Sidebar
        userPhone={userPhone}
        onLogout={handleLogout}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-bento-gold/15 bg-bento-navy-muted px-4 py-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-1.5 text-bento-offwhite/60 transition hover:bg-bento-gold/10 hover:text-bento-gold lg:hidden"
              aria-label="Abrir menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="font-display text-xl text-bento-offwhite sm:text-2xl">{title}</h1>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-bento-offwhite/60 transition hover:text-bento-gold lg:hidden"
          >
            Sair
          </button>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
