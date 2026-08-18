"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { requestOtp, verifyOtp } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { formatLocalPhoneInput, formatPhoneDisplay, isValidLocalPhone } from "@/lib/phone";
import { BrandLogo } from "@/components/brand-logo";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await requestOtp(phone);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar código");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await verifyOtp(phone, code);
      saveSession(token, user);
      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-bento-navy px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo size="lg" className="mb-6" priority />
          <p className="text-sm text-bento-offwhite/70">
            Tradição, solidez e crescimento — seus gastos direto no WhatsApp
          </p>
          <p className="mt-4 rounded-xl border border-bento-gold/20 bg-bento-navy-muted px-4 py-3 text-xs text-bento-offwhite/60">
            Enviaremos um código e as instruções iniciais no seu WhatsApp.
            Use o mesmo número aqui e nas conversas com o Bento.
          </p>
        </div>

        <div className="rounded-2xl border border-bento-gold/15 bg-bento-navy-muted p-6 shadow-2xl shadow-black/30">
          {step === "phone" ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-bento-offwhite/80">
                  WhatsApp
                </label>
                <div className="flex overflow-hidden rounded-xl border border-bento-gold/20 bg-bento-navy focus-within:border-bento-gold focus-within:ring-2 focus-within:ring-bento-gold/20">
                  <span className="flex items-center bg-bento-navy-muted px-4 text-sm font-medium text-bento-gold">
                    +55
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="6198595681"
                    value={formatPhoneDisplay(phone)}
                    onChange={(e) => setPhone(formatLocalPhoneInput(e.target.value))}
                    className="w-full bg-transparent px-4 py-3 text-bento-offwhite outline-none placeholder:text-bento-offwhite/30"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-bento-offwhite/45">
                  DDD + número. Com ou sem o 9 do celular — ex:{" "}
                  <span className="font-mono text-bento-gold/80">6198595681</span> ou{" "}
                  <span className="font-mono text-bento-gold/80">61998595681</span>
                </p>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading || !isValidLocalPhone(phone)}
                className="w-full rounded-xl bg-bento-gold py-3 font-semibold text-bento-navy transition hover:bg-bento-gold-dark disabled:opacity-50"
              >
                {loading ? "Enviando..." : "Receber código no WhatsApp"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-bento-offwhite/70">
                Enviamos um código para{" "}
                <strong className="text-bento-gold">
                  +55 {formatPhoneDisplay(phone)}
                </strong>
              </p>
              <div>
                <label className="mb-1 block text-sm font-medium text-bento-offwhite/80">
                  Código de 6 dígitos
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-xl border border-bento-gold/20 bg-bento-navy px-4 py-3 text-center text-2xl tracking-widest text-bento-offwhite outline-none focus:border-bento-gold focus:ring-2 focus:ring-bento-gold/20"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full rounded-xl bg-bento-gold py-3 font-semibold text-bento-navy transition hover:bg-bento-gold-dark disabled:opacity-50"
              >
                {loading ? "Verificando..." : "Entrar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setCode("");
                  setError("");
                }}
                className="w-full text-sm text-bento-offwhite/50 hover:text-bento-gold"
              >
                Usar outro número
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-full items-center justify-center text-bento-offwhite/40">
        Carregando...
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
