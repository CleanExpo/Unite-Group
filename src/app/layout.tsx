import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { defaultMetadata, viewport } from '@/lib/metadata';
import type { Metadata } from 'next';
import { EmpireSidebar } from '@/components/empire/EmpireSidebar';

export const metadata: Metadata = defaultMetadata;
export { viewport };

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${plusJakartaSans.variable} font-sans min-h-screen flex`}
            style={{ background: '#0a0f1e', color: '#f8fafc' }}>
        <EmpireSidebar />
        <main className="flex-1 min-h-screen overflow-auto">{children}</main>
      </body>
    </html>
  );
}
