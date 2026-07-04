"use client";

import { useEffect, useRef, useState } from "react";
import type { TransactionKind } from "@/lib/transactions";

interface MenuItem {
  kind: TransactionKind;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    kind: "expense",
    label: "Despesa",
    color: "text-red-400",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M8 6l-2 2m12 10l2-2" />
      </svg>
    ),
  },
  {
    kind: "income",
    label: "Receita",
    color: "text-emerald-400",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M16 6l2 2M6 16l-2 2" />
      </svg>
    ),
  },
  {
    kind: "credit_expense",
    label: "Despesa cartão",
    color: "text-teal-400",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h2M11 15h6M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
      </svg>
    ),
  },
];

interface AddTransactionMenuProps {
  onSelect: (kind: TransactionKind) => void;
  allowedKinds?: TransactionKind[];
  variant?: "fab" | "inline";
  className?: string;
}

export function AddTransactionMenu({
  onSelect,
  allowedKinds,
  variant = "fab",
  className = "",
}: AddTransactionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const items = allowedKinds
    ? MENU_ITEMS.filter((item) => allowedKinds.includes(item.kind))
    : MENU_ITEMS;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function select(kind: TransactionKind) {
    setOpen(false);
    onSelect(kind);
  }

  const buttonClass =
    variant === "fab"
      ? "flex h-14 w-14 items-center justify-center rounded-full bg-bento-gold text-2xl font-light text-bento-navy shadow-lg transition hover:bg-bento-gold/90"
      : "flex h-10 w-10 items-center justify-center rounded-full bg-bento-gold text-xl font-light text-bento-navy transition hover:bg-bento-gold/90";

  const containerClass =
    variant === "fab"
      ? `fixed bottom-6 right-6 z-30 ${className}`
      : `relative ${className}`;

  return (
    <div ref={ref} className={containerClass}>
      {open && (
        <div
          className={`absolute z-40 min-w-[200px] overflow-hidden rounded-2xl border border-bento-gold/15 bg-[#2a2f3a] shadow-xl ${
            variant === "fab" ? "bottom-16 right-0" : "top-12 right-0"
          }`}
        >
          {items.map((item) => (
            <button
              key={item.kind}
              type="button"
              onClick={() => select(item.kind)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-bento-offwhite/90 transition hover:bg-white/5"
            >
              <span className={item.color}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={buttonClass}
        aria-label="Adicionar lançamento"
      >
        +
      </button>
    </div>
  );
}
