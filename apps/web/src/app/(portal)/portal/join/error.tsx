'use client'

export default function JoinError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" style={{ padding: 24 }}>
      <p>Something went wrong on our side. Your invite code was not used.</p>
      <button type="button" onClick={reset}>Try again</button>
    </div>
  )
}
