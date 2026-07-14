export default function Loading() {
  return (
    <div style={{ padding: '2rem', color: 'var(--color-text-muted)', fontSize: 14 }} aria-busy="true">
      <div style={{ height: 18, width: 220, borderRadius: 2, background: 'var(--surface-overlay)', marginBottom: 12 }} />
      <div style={{ height: 120, borderRadius: 2, background: 'var(--surface-card)', border: '1px solid var(--color-border)', marginBottom: 12 }} />
      <div style={{ height: 180, borderRadius: 2, background: 'var(--surface-card)', border: '1px solid var(--color-border)' }} />
    </div>
  )
}
