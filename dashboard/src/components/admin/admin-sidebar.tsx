"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { adminLogout } from "@/lib/admin-api";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/revenue", label: "Receita" },
  { href: "/admin/users", label: "Usuários" },
  { href: "/admin/ai-costs", label: "Custo de IA" },
  { href: "/admin/logs", label: "Logs" },
];

interface AdminSidebarProps {
  adminName?: string;
}

export function AdminSidebar({ adminName }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await adminLogout();
    router.replace("/admin/login");
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-700/50 bg-slate-950">
      <div className="border-b border-slate-700/50 px-4 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Bento Admin</p>
        {adminName && (
          <p className="mt-1 truncate text-sm text-slate-400">{adminName}</p>
        )}
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-amber-500/15 text-amber-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-700/50 p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
