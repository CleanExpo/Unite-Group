import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { noIndexPageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = noIndexPageMetadata({
  path: '/portal/join',
  title: 'Open your business portal | Unite Group',
  description: 'Use your invite code to claim your business portal.',
})

export default function PortalJoinLayout({ children }: { children: ReactNode }) {
  return children
}
