import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  const isAuthRoute = pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/en/login") ||
    pathname.startsWith("/en/register");

  const isPublicRoute = isAuthRoute ||
    pathname.startsWith("/api") ||
    pathname === "/" || pathname === "/en" ||
    pathname.startsWith("/features") || pathname.startsWith("/pricing") ||
    pathname.startsWith("/contact") || pathname.startsWith("/about") ||
    pathname.startsWith("/_next") || pathname.startsWith("/en/features") ||
    pathname.startsWith("/en/pricing") || pathname.startsWith("/en/contact") ||
    pathname.startsWith("/en/about");

  // Authenticated → redirect away from auth pages
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Unauthenticated → redirect to login
  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
