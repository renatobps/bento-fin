"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { getToken } from "@/lib/auth";

const NAV_LINKS = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#recursos", label: "Recursos" },
  { href: "#planos", label: "Planos" },
  { href: "#duvidas", label: "Dúvidas" },
] as const;

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

function subscribeAuth(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export function Header() {
  const compact = useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > 40,
    () => false
  );
  const loggedIn = useSyncExternalStore(
    subscribeAuth,
    () => Boolean(getToken()),
    () => false
  );
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header
      className={`sticky top-0 z-50 border-b border-bento-gold/10 bg-bento-navy/80 backdrop-blur-md transition-[padding,box-shadow] duration-300 ${
        compact ? "py-2 shadow-lg shadow-black/40" : "py-4"
      }`}
    >
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-bento-gold focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-bento-navy"
      >
        Pular para o conteúdo
      </a>

      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 lg:px-8">
        <Link href="/" className="shrink-0 rounded-md" aria-label="Bento — página inicial">
          <Image
            src="/logo.png"
            alt="Bento"
            width={160}
            height={48}
            priority
            className={`w-auto object-contain transition-[height] duration-300 ${
              compact ? "h-8" : "h-10"
            }`}
          />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Seções da página">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-bento-offwhite/70 transition hover:text-bento-gold"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href={loggedIn ? "/dashboard" : "/login"}
            className="rounded-lg px-4 py-2 text-sm font-medium text-bento-offwhite/80 transition hover:text-bento-gold"
          >
            {loggedIn ? "Dashboard" : "Entrar"}
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-bento-gold px-4 py-2 text-sm font-semibold text-bento-navy transition hover:bg-bento-gold-dark"
          >
            Começar grátis
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-bento-offwhite lg:hidden"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          aria-controls="menu-mobile"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <div
          id="menu-mobile"
          className="fixed inset-0 z-50 flex flex-col bg-bento-navy/95 backdrop-blur-md lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navegação"
        >
          <div className="flex items-center justify-between border-b border-bento-gold/10 px-4 py-4">
            <Image src="/logo.png" alt="" width={140} height={40} className="h-8 w-auto" />
            <button
              type="button"
              className="rounded-lg p-2 text-bento-offwhite"
              aria-label="Fechar menu"
              onClick={() => setMenuOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-2 px-4 py-6" aria-label="Seções da página">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-3 text-lg text-bento-offwhite/90 transition hover:bg-bento-gold/10 hover:text-bento-gold"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href={loggedIn ? "/dashboard" : "/login"}
                className="rounded-xl border border-bento-gold/30 px-4 py-3 text-center text-sm font-medium text-bento-offwhite"
                onClick={() => setMenuOpen(false)}
              >
                {loggedIn ? "Dashboard" : "Entrar"}
              </Link>
              <Link
                href="/login"
                className="rounded-xl bg-bento-gold px-4 py-3 text-center text-sm font-semibold text-bento-navy"
                onClick={() => setMenuOpen(false)}
              >
                Começar grátis
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
