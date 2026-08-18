"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { adminMe, getAdminToken } from "@/lib/admin-api";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminName, setAdminName] = useState<string>();
  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    if (isLogin) return;
    if (!getAdminToken()) {
      router.replace("/admin/login");
      return;
    }
    adminMe()
      .then((admin) => setAdminName(admin.name ?? admin.email))
      .catch(() => router.replace("/admin/login"));
  }, [isLogin, router]);

  if (isLogin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">{children}</div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <AdminSidebar adminName={adminName} />
      <main className="flex-1 overflow-auto p-6 lg:p-8">{children}</main>
    </div>
  );
}
