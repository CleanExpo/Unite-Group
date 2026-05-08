import { JetBrains_Mono, Syne } from 'next/font/google';
import './globals.css';
import { defaultMetadata, viewport } from '@/lib/metadata';
import type { Metadata } from 'next';
import { EmpireSidebar } from '@/components/empire/EmpireSidebar';

export const metadata: Metadata = defaultMetadata;
export { viewport };

// Syne: distinctive geometric grotesque — NOT Inter. Sharp, architectural, unmistakable.
const syne = Syne({ subsets: ['latin'], variable: '--font-display', display: 'swap', weight: ['400','500','600','700','800'] });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap', weight: ['400','500','600','700'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${syne.variable} ${mono.variable}`}
            style={{ background: '#08080a', color: '#f0f0f2', fontFamily: 'var(--font-display), system-ui, sans-serif', minHeight: '100vh', display: 'flex' }}>
        <EmpireSidebar />
        <main style={{ flex: 1, minHeight: '100vh', overflow: 'auto' }}>{children}</main>
      </body>
    </html>
  );
}
