import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Só decide para onde redirecionar. A autorização real é do backend, que
 * valida o token da sessão admin em cada requisição — este cookie carrega
 * apenas um sinalizador, nunca o token.
 */
const ADMIN_FLAG_COOKIE = "admin_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(ADMIN_FLAG_COOKIE)?.value);

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!hasSession) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  if (pathname === "/admin/login" && hasSession) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
