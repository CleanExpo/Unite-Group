import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const locales = ['en', 'es', 'fr'];
const defaultLocale = 'en';

const publicPaths = [
  '/', '/features', '/pricing', '/contact', '/about', '/blog',
  '/case-studies', '/login', '/register', '/reset-password',
  '/forgot-password', '/update-password', '/terms', '/privacy',
  '/book-consultation', '/admin/geo-citations',
];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Skip static assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.match(/\.(ico|png|jpg|svg|woff2?|ttf|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // Strip locale prefix for auth checks
  const localePrefix = locales.find(l => pathname.startsWith(`/${l}/`) || pathname === `/${l}`);
  const strippedPath = localePrefix
    ? pathname.slice(localePrefix.length + 1) || '/'
    : pathname;

  // Locale redirect: add default locale if missing
  const missingLocale = !locales.some(l => pathname.startsWith(`/${l}/`) || pathname === `/${l}`);
  if (missingLocale) {
    const url = req.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.redirect(url);
  }

  // Auth check via Supabase
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  const isPublic = publicPaths.some(p =>
    strippedPath === p || strippedPath.startsWith(`${p}/`)
  ) || strippedPath.startsWith('/clients/') || strippedPath.startsWith('/auth');

  // Authenticated user on auth page → dashboard
  if (session && (strippedPath === '/login' || strippedPath === '/register')) {
    return NextResponse.redirect(new URL(`/${defaultLocale}/dashboard`, req.url));
  }

  // Unauthenticated user on protected page → login
  if (!session && !isPublic) {
    return NextResponse.redirect(new URL(`/${defaultLocale}/login`, req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
