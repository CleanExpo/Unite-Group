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
      {/* #d02f35 = --deck-abort-text (darkened abort-red, ~5.07:1 on white); #e5484d fails AA as text at 3.91:1 */}
      <span style={{ fontSize: 14, fontWeight: 600, color: '#d02f35' }}>Wiki graph failed to render</span>
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
