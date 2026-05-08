import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/','/en','/es','/fr',
  '/login','/register','/reset-password','/forgot-password','/update-password',
  '/en/login','/en/register','/en/reset-password','/en/update-password',
  '/features','/pricing','/contact','/about',
  '/en/features','/en/pricing','/en/contact','/en/about',
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

  // Use @supabase/ssr — correctly reads chunked cookies written by createBrowserClient
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/')) ||
    pathname.startsWith('/clients/') ||
    pathname.startsWith('/book-') ||
    pathname.startsWith('/case-') ||
    pathname.startsWith('/blog') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/auth');

  const isAuthPage = pathname.includes('/login') || pathname.includes('/register');

  // Logged in on auth page → send to CEO dashboard
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/ceo', req.url));
  }

  // Not logged in on protected page → login
  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/en/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
