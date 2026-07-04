"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { SpendingLimitsPanel } from "@/components/spending-limits";

export default function LimitesPage() {
  return (
    <DashboardShell title="Limites">
      <p className="mb-6 text-sm text-bento-offwhite/50">
        Cadastre limites de gasto diário, semanal e mensal. Ao ultrapassar, você
        recebe um aviso no WhatsApp.
      </p>
      <SpendingLimitsPanel />
    </DashboardShell>
  );
}
