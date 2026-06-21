'use client'
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ padding: "2rem" }}>
      <p style={{ color: "var(--color-text-primary)", fontWeight: 500, margin: 0 }}>Something went wrong loading this page.</p>
      <p style={{ color: "var(--color-text-muted)", fontSize: 13, margin: "6px 0 12px" }}>{error.message}</p>
      <button type="button" onClick={() => reset()}>Try again</button>
    </div>
  )
}
