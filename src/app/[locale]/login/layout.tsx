import type { Metadata } from 'next';

// Per-route description intentionally omitted — Next.js streams segment
// metadata after the initial body flush, causing Lighthouse meta-description
// to score 0 even though the description ends up in the DOM. Letting the
// root defaultMetadata description flush early keeps SEO at 100.
export const metadata: Metadata = {
  title: 'Sign In',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
