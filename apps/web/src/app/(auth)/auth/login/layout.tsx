import type { Metadata } from "next";

import { noIndexPageMetadata } from '@/lib/page-metadata'

// The founder's own sign-in: never indexed, and never described as a customer login.
export const metadata: Metadata = noIndexPageMetadata({
  path: '/auth/login',
  title: 'Sign in | Unite Group',
  description: 'Secure sign-in for Unite Group founders and team.',
})

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
