'use client'

export default function CardReviewsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" style={{ padding: 24 }}>
      <p>Your review settings could not load. Nothing was sent.</p>
      <button type="button" onClick={reset}>Try again</button>
    </div>
  )
}
