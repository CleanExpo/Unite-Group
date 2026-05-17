// @ts-nocheck
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Only auth pages are public — everything else requires login
const AUTH_PATHS = [
  '/login', '/register', '/reset-password', '/forgot-password', '/update-password',
  '/en/login', '/en/register', '/en/reset-password', '/en/update-password',
  '/auth',
];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  // Expose pathname to server components (root layout uses it to decide
  // whether to render the empire sidebar — marketing pages skip it).
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set('x-pathname', pathname);
  const res = NextResponse.next({ request: { headers: reqHeaders } });

  // Skip static/API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|woff2?|ttf|css|js|json|txt|xml)$/)
  ) return res;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );

  // getUser() makes a verified network call — not susceptible to stale cookie issues
  // Wrap in try/catch — if Supabase is unreachable, treat as unauthenticated (never crash)
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Network error — redirect to login as unauthenticated
    if (!AUTH_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
      return NextResponse.redirect(new URL('/en/login', req.url));
    }
    return res;
  }

  const isAuthPage = AUTH_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));

  // Logged in -> send auth pages to the current operator cockpit.
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/en/command-center', req.url));
  }

  // /empire/* → canonically /en/empire/* — redirect bare path so middleware auth applies
  if (pathname === '/empire' || pathname.startsWith('/empire/')) {
    const rest = pathname.replace(/^\/empire/, '');
    return NextResponse.redirect(new URL(`/en/empire${rest}`, req.url));
  }

  // /client/* → canonically /en/client/* — redirect bare path so middleware auth applies
  if (pathname === '/client' || pathname.startsWith('/client/')) {
    const rest = pathname.replace(/^\/client/, '');
    return NextResponse.redirect(new URL(`/en/client${rest}`, req.url));
  }

  // Marketing pages — public. Unauth visitors see the landing; signed-in
  // users hitting / or /<locale> get sent to their CEO dashboard (preserves
  // operator-on-the-desk behaviour for Phill).
  const PUBLIC_MARKETING_PREFIXES = ['/about', '/services', '/contact'];
  const isPublicMarketing =
    pathname === '/' ||
    pathname === '/en' || pathname === '/es' || pathname === '/fr' ||
    PUBLIC_MARKETING_PREFIXES.some(p =>
      pathname === '/en' + p || pathname.startsWith('/en' + p + '/')
    );

  if ((pathname === '/' || pathname === '/en' || pathname === '/es' || pathname === '/fr') && user) {
    return NextResponse.redirect(new URL('/en/command-center', req.url));
  }
  if (pathname === '/' && !user) {
    return NextResponse.redirect(new URL('/en', req.url));
  }

  // Not logged in on any non-auth, non-public page → login
  if (!user && !isAuthPage && !isPublicMarketing) {
    return NextResponse.redirect(new URL('/en/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
