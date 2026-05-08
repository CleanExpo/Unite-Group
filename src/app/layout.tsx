import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { defaultMetadata, viewport } from '@/lib/metadata';
import type { Metadata } from 'next';
import { EmpireSidebar } from '@/components/empire/EmpireSidebar';

export const metadata: Metadata = defaultMetadata;
export { viewport };

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap', weight: ['400','500','600','700'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${inter.variable} ${mono.variable} font-sans min-h-screen flex`}
            style={{ background: '#0a0f1e', color: '#f8fafc' }}>
        <EmpireSidebar />
        <main className="flex-1 min-h-screen overflow-auto">{children}</main>
      </body>
    </html>
  );
}
