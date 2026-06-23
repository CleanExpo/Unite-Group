export default function Loading() {
  return (
    <div className="p-6" aria-busy="true">
      <div style={{ height: 22, width: 260, borderRadius: 8, background: "var(--surface-overlay)", marginBottom: 8 }} />
      <div style={{ height: 14, width: 420, maxWidth: "100%", borderRadius: 8, background: "var(--surface-overlay)", marginBottom: 24 }} />
      <div style={{ height: 160, borderRadius: 12, background: "var(--surface-card)", border: "1px solid var(--color-border)" }} />
    </div>
  )
}
