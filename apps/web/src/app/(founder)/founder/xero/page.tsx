export const dynamic = 'force-dynamic'

import { getUser } from '@/lib/supabase/server'
import { isXeroConfigured, loadXeroTokens } from '@/lib/integrations/xero'
import { ConnectCard } from '@/components/founder/integrations/ConnectCard'
import { XeroConnectButton } from '@/components/founder/xero/XeroConnectButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { BUSINESSES, type Business } from '@/lib/businesses'

function businessesByKey(keys: string[]): Business[] {
  return keys
    .map((key) => BUSINESSES.find((business) => business.key === key))
    .filter((business): business is Business => Boolean(business))
}

const XERO_ACCOUNTS = [
  {
    label: 'Owned - Disaster Recovery Group',
    description: 'Disaster Recovery and NRPG bookkeeping entities',
    businesses: businessesByKey(['dr', 'nrpg']),
  },
  {
    label: 'Owned - CARSI Portfolio',
    description: 'CARSI, RestoreAssist, ATO App, and SYNTHEX',
    businesses: businessesByKey(['carsi', 'restore', 'ato', 'synthex']),
  },
  {
    label: 'Client Accounts',
    description: 'Client systems tracked separately from owner books',
    businesses: businessesByKey(['ccw']),
  },
]

async function getConnectedBusinesses(founderId: string): Promise<Set<string>> {
  const connected = new Set<string>()
  const businesses = XERO_ACCOUNTS.flatMap((account) => account.businesses)

  for (const business of businesses) {
    const tokens = await loadXeroTokens(founderId, business.key)
    if (tokens) connected.add(business.key)
  }

  return connected
}

export default async function XeroPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; business?: string; error?: string }>
}) {
  const params = await searchParams
  const configured = isXeroConfigured()
  const user = await getUser()
  const connected = user ? await getConnectedBusinesses(user.id) : new Set<string>()

  const allBusinesses = XERO_ACCOUNTS.flatMap((account) => account.businesses)
  const connectedName =
    allBusinesses.find((business) => business.key === params.business)?.name ?? params.business

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Xero"
        subtitle="Manage Xero connections for owned businesses and client accounts"
      />

      {params.connected && (
        <div className="text-xs text-[#15803d]/80 border border-[#16a34a]/20 bg-[#16a34a]/5 px-4 py-2.5 rounded-sm">
          {connectedName} connected to Xero
        </div>
      )}

      {params.error && (
        <div className="text-xs text-red-700/80 border border-red-400/20 bg-red-400/5 px-4 py-2.5 rounded-sm">
          Connection error: {params.error}
        </div>
      )}

      {!configured ? (
        <ConnectCard
          service="Xero"
          description="Xero credentials are not configured. Add XERO_CLIENT_ID and XERO_CLIENT_SECRET to your environment."
          connectUrl="#"
          icon="X"
          comingSoon
        />
      ) : (
        <div className="space-y-6 max-w-2xl">
          {XERO_ACCOUNTS.map((account) => (
            <div key={account.label}>
              <div className="flex items-center gap-3 mb-2">
                <div>
                  <p
                    className="text-[10px] uppercase tracking-[0.3em]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {account.label}
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {account.description}
                  </p>
                </div>
                <div
                  className="flex-1 h-px"
                  style={{ background: 'var(--color-border)' }}
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                {account.businesses.map((business) => {
                  const isConnected = connected.has(business.key)
                  const isClient = business.type === 'client'
                  return (
                    <div
                      key={business.key}
                      className="flex items-center justify-between border border-white/8 px-5 py-4 rounded-sm"
                      style={{ background: 'var(--surface-card)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: business.color }}
                        />
                        <div>
                          <p
                            className="text-sm font-light"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {business.name}
                          </p>
                          <p
                            className="text-xs mt-0.5"
                            style={{
                              color: isConnected ? '#16a34a' : 'var(--color-text-muted)',
                            }}
                          >
                            {isConnected
                              ? isClient
                                ? 'Connected - client account'
                                : 'Connected - bank feeds active'
                              : isClient
                                ? 'Client account - connect only when needed'
                                : 'Not connected'}
                          </p>
                        </div>
                      </div>

                      {isConnected ? (
                        <span className="text-[10px] uppercase tracking-widest text-[#15803d]/80 border border-[#16a34a]/30 px-2.5 py-1 rounded-sm">
                          Live
                        </span>
                      ) : (
                        <XeroConnectButton
                          businessKey={business.key}
                          businessName={business.name}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
