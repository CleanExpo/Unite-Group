'use client'

// Error boundary for the Wiki Graph View (UNI-2304).
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        height: '100vh',
        background: '#fffdf7',
        color: '#14241b',
        fontFamily: 'var(--font-chakra), system-ui, sans-serif',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, color: '#e5484d' }}>Wiki graph failed to render</span>
      <button
        onClick={reset}
        style={{
          fontSize: 12,
          padding: '6px 14px',
          borderRadius: 2,
          border: '1px solid rgba(45,187,87,0.25)',
          background: '#ffffff',
          color: '#15803d',
          cursor: 'pointer',
        }}
      >
        Retry
      </button>
    </div>
  )
}
