"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { ProfilePanel } from "@/components/profile-panel";

export default function PerfilPage() {
  return (
    <DashboardShell title="Perfil">
      <ProfilePanel />
    </DashboardShell>
  );
}
