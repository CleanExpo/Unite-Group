import type { Metadata } from 'next'

import { noIndexPageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = noIndexPageMetadata({
  title: 'Card not found | Unite Group',
  description: 'This living business card is not available.',
  canonical: null,
})

// the same page for an unknown, unpublished and invalid card address
export default function CardNotFound() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16, background: '#0b0d10', color: '#f4efe6' }}>
      <p>This card is not available.</p>
    </main>
  )
}
