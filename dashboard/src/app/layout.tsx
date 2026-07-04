import type { Metadata } from "next";
import { Cinzel, Montserrat } from "next/font/google";
import "./globals.css";
import { CrispProvider } from "@/components/crisp-chat";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Bento Finanças — Controle seus gastos pelo WhatsApp",
  description: "Registre gastos e receitas via WhatsApp. Dashboard completo para acompanhar suas finanças.",
  icons: {
    icon: "/log1.png",
    apple: "/log1.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${montserrat.variable} ${cinzel.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col bg-bento-navy text-bento-offwhite"
        suppressHydrationWarning
      >
        {children}
        <CrispProvider />
      </body>
    </html>
  );
}
