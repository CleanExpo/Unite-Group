import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Card not found', robots: { index: false, follow: false } }

// the same page for an unknown, unpublished and invalid card address
export default function CardNotFound() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16, background: '#0b0d10', color: '#f4efe6' }}>
      <p>This card is not available.</p>
    </main>
  )
}
