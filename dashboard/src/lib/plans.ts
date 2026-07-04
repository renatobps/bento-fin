export type BillingInterval = "monthly" | "yearly";
export type PaidPlan = "essencial" | "pro";

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface PlanDefinition {
  id: "free" | PaidPlan;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  highlighted?: boolean;
  features: PlanFeature[];
}

export const PLANS: PlanDefinition[] = [
  {
    id: "free",
    name: "Gratuito",
    description: "Para começar a organizar suas finanças",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      { text: "30 gastos por mês", included: true },
      { text: "10 receitas por mês", included: true },
      { text: "Consultas via WhatsApp", included: true },
      { text: "Dashboard básico", included: true },
      { text: "Áudio (Whisper)", included: false },
      { text: "Cartões de crédito", included: false },
      { text: "Exportação PDF/CSV", included: false },
    ],
  },
  {
    id: "essencial",
    name: "Essencial",
    description: "Controle completo no WhatsApp e no dashboard",
    monthlyPrice: 14.9,
    yearlyPrice: 119,
    highlighted: true,
    features: [
      { text: "Gastos ilimitados", included: true },
      { text: "Receitas ilimitadas", included: true },
      { text: "Áudio no WhatsApp", included: true },
      { text: "Dashboard completo", included: true },
      { text: "Até 2 cartões de crédito", included: true },
      { text: "Limites de gasto", included: true },
      { text: "Alertas de vencimento", included: true },
      { text: "Suporte por e-mail", included: true },
      { text: "Exportação PDF/CSV", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Para quem quer o máximo de controle",
    monthlyPrice: 24.9,
    yearlyPrice: 199,
    features: [
      { text: "Tudo do Essencial", included: true },
      { text: "Cartões ilimitados", included: true },
      { text: "Exportação PDF/CSV", included: true },
      { text: "Suporte prioritário", included: true },
    ],
  },
];

export function yearlyDiscountPercent(monthly: number, yearly: number): number {
  if (monthly <= 0) return 0;
  const fullYear = monthly * 12;
  return Math.round((1 - yearly / fullYear) * 100);
}

export function formatPlanPrice(value: number, interval: BillingInterval): string {
  if (value === 0) return "R$0";
  const formatted = value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  return interval === "monthly" ? `${formatted}/mês` : `${formatted}/ano`;
}
