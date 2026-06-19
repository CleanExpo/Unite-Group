'use client'
// src/components/founder/xero/XeroConnectButton.tsx
// Direct link to Xero OAuth — session auth via getUser() in the API route is sufficient.

interface XeroConnectButtonProps {
  businessKey: string
  businessName: string
}

export function XeroConnectButton({ businessKey, businessName: _ }: XeroConnectButtonProps) {
  return (
    <a
      href={`/api/xero/connect?business=${businessKey}`}
      className="text-[10px] uppercase tracking-widest border px-2.5 py-1 rounded-sm transition-colors"
      style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border-strong)' }}
    >
      Connect →
    </a>
  )
}
