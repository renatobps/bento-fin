import Image from "next/image";
import Link from "next/link";
import { getSupportEmail } from "@/lib/crisp";

export function Footer() {
  const supportEmail = getSupportEmail();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-bento-gold/10 px-4 py-12 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Image
            src="/logo.png"
            alt="Bento"
            width={160}
            height={48}
            className="h-10 w-auto object-contain"
          />
          <p className="mt-4 max-w-xs text-sm text-bento-offwhite/55">
            Seu assistente financeiro no WhatsApp
          </p>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-bento-gold">
            Links
          </p>
          <ul className="space-y-2 text-sm text-bento-offwhite/65">
            <li>
              <a href="#planos" className="transition hover:text-bento-gold">
                Planos
              </a>
            </li>
            <li>
              <Link href="/login" className="transition hover:text-bento-gold">
                Entrar
              </Link>
            </li>
            <li>
              <Link href="/suporte" className="transition hover:text-bento-gold">
                Suporte
              </Link>
            </li>
            <li>
              <Link href="/suporte" className="transition hover:text-bento-gold">
                Central de ajuda
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-bento-gold">
            Legal
          </p>
          <ul className="space-y-2 text-sm text-bento-offwhite/65">
            <li>
              <Link href="/suporte" className="transition hover:text-bento-gold">
                Termos de Uso
              </Link>
            </li>
            <li>
              <Link href="/suporte" className="transition hover:text-bento-gold">
                Política de Privacidade
              </Link>
            </li>
            <li>
              <a
                href={`mailto:${supportEmail}`}
                className="transition hover:text-bento-gold"
              >
                {supportEmail}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <p className="mx-auto mt-10 max-w-6xl border-t border-bento-gold/10 pt-6 text-center text-sm text-bento-offwhite/40">
        © {year} Bento. Todos os direitos reservados.
      </p>
    </footer>
  );
}
