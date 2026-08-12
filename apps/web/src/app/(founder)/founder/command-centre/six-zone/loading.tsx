export default function Loading() {
  return (
    <div style={{ padding: "2rem", color: "var(--color-text-muted)", fontSize: 14 }} aria-busy="true">
      <div style={{ height: 18, width: 220, borderRadius: 8, background: "var(--surface-overlay)", marginBottom: 12 }} />
      <div style={{ height: 120, borderRadius: 12, background: "var(--surface-card)", border: "1px solid var(--color-border)" }} />
    </div>
  )
}
