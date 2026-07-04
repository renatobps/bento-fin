"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchProfile, updateProfile } from "@/lib/api";
import { getToken, updateStoredUser } from "@/lib/auth";

export function ProfilePanel() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneDisplay, setPhoneDisplay] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const loadProfile = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    setError("");
    try {
      const profile = await fetchProfile(token);
      setName(profile.name ?? "");
      setEmail(profile.email ?? "");
      setPhoneDisplay(profile.phoneDisplay);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar perfil");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const updated = await updateProfile(token, {
        name: name.trim() || null,
        email: email.trim() || null,
      });
      updateStoredUser({
        name: updated.name,
        email: updated.email,
      });
      setName(updated.name ?? "");
      setEmail(updated.email ?? "");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-bento-gold/10 bg-bento-navy-muted p-6">
        <p className="text-bento-offwhite/40">Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-bento-gold/10 bg-bento-navy-muted p-6">
      <h2 className="mb-1 font-display text-lg text-bento-offwhite">Seus dados</h2>
      <p className="mb-6 text-sm text-bento-offwhite/50">
        Atualize como você aparece no dashboard. O login continua pelo WhatsApp.
      </p>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          Perfil salvo com sucesso!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-bento-offwhite/70">WhatsApp</label>
          <input
            type="text"
            value={phoneDisplay}
            disabled
            className="w-full cursor-not-allowed rounded-xl border border-bento-gold/10 bg-bento-navy/60 px-4 py-2.5 text-bento-offwhite/50"
          />
          <p className="mt-1 text-xs text-bento-offwhite/40">
            O número de login não pode ser alterado aqui.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm text-bento-offwhite/70">Nome</label>
          <input
            type="text"
            maxLength={100}
            placeholder="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-bento-gold/20 bg-bento-navy py-2.5 px-4 text-bento-offwhite placeholder:text-bento-offwhite/30 focus:border-bento-gold/50 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-bento-offwhite/70">E-mail</label>
          <input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-bento-gold/20 bg-bento-navy py-2.5 px-4 text-bento-offwhite placeholder:text-bento-offwhite/30 focus:border-bento-gold/50 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-bento-gold px-6 py-2.5 text-sm font-semibold text-bento-navy transition hover:bg-bento-gold/90 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar perfil"}
        </button>
      </form>
    </div>
  );
}
