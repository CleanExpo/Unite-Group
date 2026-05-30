import { JetBrains_Mono, Syne, Poppins, IBM_Plex_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import { defaultMetadata, viewport } from '@/lib/metadata';
import type { Metadata } from 'next';
import { EmpireSidebar } from '@/components/empire/EmpireSidebar';

export const metadata: Metadata = defaultMetadata;
export { viewport };

// Syne: distinctive geometric grotesque — NOT Inter. Sharp, architectural, unmistakable.
const syne = Syne({ subsets: ['latin'], variable: '--font-display', display: 'swap', weight: ['400','500','600','700','800'] });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap', weight: ['400','500','600','700'] });
const poppins = Poppins({ subsets: ['latin'], variable: '--font-layered-primary', display: 'swap', weight: ['400','500','600','700'] });
const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-layered-mono', display: 'swap', weight: ['400','500'] });

const PUBLIC_PREFIXES = ['/about', '/services', '/contact'];
function isPublicMarketing(pathname: string): boolean {
  if (pathname === '/' || pathname === '/en' || pathname === '/es' || pathname === '/fr') return true;
  if (pathname.startsWith('/en/login') || pathname.startsWith('/en/register') ||
      pathname.startsWith('/en/reset-password') || pathname.startsWith('/en/update-password')) return true;
  return PUBLIC_PREFIXES.some(p => pathname === '/en' + p || pathname.startsWith('/en' + p + '/'));
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get('x-pathname') ?? '';
  const showSidebar = !isPublicMarketing(pathname);
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${syne.variable} ${mono.variable} ${poppins.variable} ${ibmMono.variable}`}
            style={{ background: '#08080a', color: '#f0f0f2', fontFamily: 'var(--font-display), system-ui, sans-serif', minHeight: '100vh', display: 'flex' }}>
        {showSidebar && <EmpireSidebar />}
        <main style={{ flex: 1, minHeight: '100vh', overflow: 'auto' }}>{children}</main>
      </body>
    </html>
  );
}
