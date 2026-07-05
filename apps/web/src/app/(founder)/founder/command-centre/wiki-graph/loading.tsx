// Loading skeleton for the Wiki Graph View (UNI-2304).
export default function Loading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#fffdf7',
        color: '#5a6b62',
        fontSize: 13,
        fontFamily: 'var(--font-chakra), system-ui, sans-serif',
      }}
    >
      Building wiki graph…
    </div>
  )
}
