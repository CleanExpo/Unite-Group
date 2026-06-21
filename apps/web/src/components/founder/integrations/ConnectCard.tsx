"use client"

// src/components/founder/integrations/ConnectCard.tsx
// Reusable "Connect [Service]" card — used by all integration pages

interface ConnectCardProps {
  service: string
  description: string
  connectUrl: string
  icon: string
  comingSoon?: boolean
}

export function ConnectCard({
  service,
  description,
  connectUrl,
  icon,
  comingSoon,
}: ConnectCardProps) {
  return (
    <div className="border border-white/[0.10] p-8 rounded-sm max-w-md">
      <div className="text-4xl mb-4">{icon}</div>
      <h2 className="text-lg font-light text-[#0A0A0A] mb-2">Connect {service}</h2>
      <p className="text-sm text-[#52525b] mb-6 leading-relaxed">{description}</p>
      {comingSoon ? (
        <div className="inline-flex items-center gap-2 px-4 py-2 border text-xs uppercase tracking-widest rounded-sm cursor-not-allowed" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
          Coming Soon
        </div>
      ) : (
        <a
          href={connectUrl}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#16a34a]/10 border border-[#16a34a]/30 text-[#15803d] text-[11px] uppercase tracking-[0.2em] hover:bg-[#16a34a]/20 transition-colors rounded-sm"
        >
          Connect {service} →
        </a>
      )}
    </div>
  )
}
