"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchLimits,
  formatCurrency,
  updateLimits,
  type LimitsInput,
  type LimitsResponse,
} from "@/lib/api";
import { getToken } from "@/lib/auth";

interface LimitFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  usage?: { total: number; limit: number | null };
}

function LimitField({ label, value, onChange, usage }: LimitFieldProps) {
  const limit = usage?.limit ?? (value ? parseFloat(value) : null);
  const total = usage?.total ?? 0;
  const pct =
    limit && limit > 0 ? Math.min((total / limit) * 100, 100) : null;
  const exceeded = limit !== null && limit > 0 && total > limit;

  return (
    <div>
      <label className="mb-1 block text-sm text-bento-offwhite/70">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-bento-offwhite/40">
          R$
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Sem limite"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-bento-gold/20 bg-bento-navy py-2.5 pl-10 pr-4 text-bento-offwhite placeholder:text-bento-offwhite/30 focus:border-bento-gold/50 focus:outline-none"
        />
      </div>
      {limit !== null && limit > 0 && pct !== null && (
        <div className="mt-2">
          <div className="mb-1 flex justify-between text-xs text-bento-offwhite/50">
            <span>
              {formatCurrency(total)} de {formatCurrency(limit)}
            </span>
            <span className={exceeded ? "text-red-400" : ""}>
              {exceeded ? "Ultrapassado" : `${Math.round(pct)}%`}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-bento-navy">
            <div
              className={`h-full rounded-full transition-all ${
                exceeded ? "bg-red-500" : "bg-bento-gold"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function SpendingLimitsPanel() {
  const [data, setData] = useState<LimitsResponse | null>(null);
  const [daily, setDaily] = useState("");
  const [weekly, setWeekly] = useState("");
  const [monthly, setMonthly] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const loadLimits = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    setError("");
    try {
      const limits = await fetchLimits(token);
      setData(limits);
      setDaily(limits.dailyLimit?.toString() ?? "");
      setWeekly(limits.weeklyLimit?.toString() ?? "");
      setMonthly(limits.monthlyLimit?.toString() ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar limites");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLimits();
  }, [loadLimits]);

  function parseField(value: string): number | null {
    if (!value.trim()) return null;
    const num = parseFloat(value);
    return Number.isFinite(num) && num > 0 ? num : null;
  }

  async function handleSave() {
    const token = getToken();
    if (!token) return;

    setSaving(true);
    setError("");
    setSuccess(false);

    const payload: LimitsInput = {
      dailyLimit: parseField(daily),
      weeklyLimit: parseField(weekly),
      monthlyLimit: parseField(monthly),
    };

    try {
      await updateLimits(token, payload);
      await loadLimits();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar limites");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-bento-gold/10 bg-bento-navy-muted p-6">
      <div className="mb-4">
        <h2 className="font-display text-lg text-bento-offwhite">
          Limites de gasto
        </h2>
        <p className="mt-1 text-sm text-bento-offwhite/50">
          Configure aqui. Ao ultrapassar um limite, você recebe um aviso no
          WhatsApp.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          Limites salvos com sucesso!
        </div>
      )}

      {loading ? (
        <p className="py-4 text-center text-bento-offwhite/40">Carregando...</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <LimitField
              label="Limite diário"
              value={daily}
              onChange={setDaily}
              usage={data?.usage.hoje}
            />
            <LimitField
              label="Limite semanal"
              value={weekly}
              onChange={setWeekly}
              usage={data?.usage.semana}
            />
            <LimitField
              label="Limite mensal"
              value={monthly}
              onChange={setMonthly}
              usage={data?.usage.mes}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-6 rounded-xl bg-bento-gold px-6 py-2.5 text-sm font-semibold text-bento-navy transition hover:bg-bento-gold/90 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar limites"}
          </button>
        </>
      )}
    </div>
  );
}
