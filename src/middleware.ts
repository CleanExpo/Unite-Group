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
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

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
  const { data: { user } } = await supabase.auth.getUser();

  const isAuthPage = AUTH_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));

  // Logged in → send auth pages to CEO dashboard
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/en/ceo', req.url));
  }

  // Root URL → redirect to CEO dashboard (authenticated) or login (not)
  if (pathname === '/' || pathname === '/en' || pathname === '/es' || pathname === '/fr') {
    return NextResponse.redirect(new URL(user ? '/en/ceo' : '/en/login', req.url));
  }

  // Not logged in on any non-auth page → login
  if (!user && !isAuthPage) {
    return NextResponse.redirect(new URL('/en/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
