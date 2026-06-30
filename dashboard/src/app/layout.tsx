import type { Metadata } from "next";
import { Cinzel, Montserrat } from "next/font/google";
import "./globals.css";

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
  title: "Bento Finanças — Dashboard",
  description: "Visualize seus gastos registrados via WhatsApp",
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
      </body>
    </html>
  );
}
