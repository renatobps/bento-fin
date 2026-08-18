import type { Metadata } from "next";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { TrustBar } from "@/components/landing/trust-bar";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { ComparisonTable } from "@/components/landing/comparison-table";
import { PlansSection } from "@/components/landing/plans";
import { Testimonials } from "@/components/landing/testimonials";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { Reveal } from "@/components/landing/reveal";

const TITLE = "Bento — Controle seus gastos pelo WhatsApp";
const DESCRIPTION =
  "Registre gastos por mensagem ou áudio no WhatsApp. Saldo em tempo real, controle de cartão de crédito e painel web completo. Grátis.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/logo.png",
        alt: "Bento Finanças",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/logo.png"],
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-full bg-bento-navy">
      <Header />
      <main id="conteudo">
        <Hero />
        <TrustBar />
        <Reveal>
          <HowItWorks />
        </Reveal>
        <Reveal>
          <FeaturesGrid />
        </Reveal>
        <Reveal>
          <ComparisonTable />
        </Reveal>
        <Reveal>
          <PlansSection />
        </Reveal>
        <Reveal>
          <Testimonials />
        </Reveal>
        <Reveal>
          <FaqAccordion />
        </Reveal>
        <Reveal>
          <FinalCta />
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}
