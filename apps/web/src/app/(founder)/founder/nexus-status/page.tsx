export const dynamic = 'force-dynamic'

const sections = ['Active Tickets', 'Open PRs', 'Approval Queue'] as const

export default function NexusStatusPage() {
  return (
    <main className="min-h-screen bg-[#050505] p-6 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#00F5FF]">Nexus command spine</p>
          <h1 className="text-3xl font-semibold tracking-tight">Nexus Status</h1>
          <p className="max-w-2xl text-sm text-white/60">
            A draft status cockpit for active tickets, pull requests, and approval gates. Live data wiring is a follow-up.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {sections.map((label) => (
            <section
              key={label}
              aria-labelledby={`nexus-status-${label.toLowerCase().replace(/\s+/g, '-')}`}
              className="rounded-sm border border-white/10 bg-white/[0.03] p-5 shadow-[0_0_32px_rgba(0,245,255,0.06)]"
            >
              <h2
                id={`nexus-status-${label.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-sm font-semibold uppercase tracking-[0.18em] text-white"
              >
                {label}
              </h2>
              <p className="mt-4 rounded-sm border border-dashed border-white/10 bg-black/30 px-3 py-6 text-center text-sm text-white/50">
                No data yet
              </p>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
