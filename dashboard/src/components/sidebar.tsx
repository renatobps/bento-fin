"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  matchPaths?: string[];
}

function DashboardIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  );
}

function TransactionsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />
    </svg>
  );
}

function LimitsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m-4-4h8M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h2M11 15h6M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function PlanIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <DashboardIcon />,
    matchPaths: ["/dashboard"],
  },
  {
    href: "/dashboard/transacoes",
    label: "Transações",
    icon: <TransactionsIcon />,
    matchPaths: [
      "/dashboard/transacoes",
      "/dashboard/receitas",
      "/dashboard/despesas",
      "/dashboard/saldo",
    ],
  },
  {
    href: "/dashboard/cartoes",
    label: "Cartões",
    icon: <CreditCardIcon />,
    matchPaths: ["/dashboard/cartoes", "/dashboard/credito"],
  },
  {
    href: "/dashboard/limites",
    label: "Limites",
    icon: <LimitsIcon />,
    matchPaths: ["/dashboard/limites"],
  },
  {
    href: "/planos",
    label: "Meu plano",
    icon: <PlanIcon />,
    matchPaths: ["/planos"],
  },
  {
    href: "/dashboard/perfil",
    label: "Perfil",
    icon: <ProfileIcon />,
    matchPaths: ["/dashboard/perfil"],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  const paths = item.matchPaths ?? [item.href];
  if (item.href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

interface SidebarNavProps {
  onNavigate?: () => void;
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-bento-gold/15 text-bento-gold"
                : "text-bento-offwhite/70 hover:bg-bento-gold/5 hover:text-bento-offwhite"
            }`}
          >
            <span className={active ? "text-bento-gold" : "text-bento-offwhite/50"}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

interface SidebarProps {
  userPhone: string;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ userPhone, onLogout, mobileOpen, onCloseMobile }: SidebarProps) {
  const content = (
    <>
      <div className="border-b border-bento-gold/10 px-4 py-5">
        <Link href="/dashboard" onClick={onCloseMobile} className="flex justify-center lg:justify-start">
          <BrandLogo size="sm" />
        </Link>
      </div>

      <SidebarNav onNavigate={onCloseMobile} />

      <div className="mt-auto border-t border-bento-gold/10 p-4">
        {userPhone && (
          <p className="mb-3 truncate text-xs text-bento-offwhite/45">{userPhone}</p>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="w-full rounded-xl border border-bento-gold/20 px-3 py-2 text-sm text-bento-offwhite/70 transition hover:border-bento-gold/40 hover:text-bento-gold"
        >
          Sair
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden w-60 shrink-0 flex-col border-r border-bento-gold/10 bg-bento-navy-muted lg:flex">
        {content}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Fechar menu"
            onClick={onCloseMobile}
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-bento-navy-muted shadow-xl">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
