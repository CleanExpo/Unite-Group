'use client'

// src/app/(founder)/founder/campaigns/new/page.tsx
// Step 1: Scan a website for Brand DNA (BrandScanner)
// Step 2: Configure and generate campaign assets (CampaignGenerator)
// Step 3: Redirect to the campaign detail page

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BrandProfileSelector, type BrandProfileOption } from '@/components/founder/campaigns/BrandProfileSelector'
import { BrandScanner } from '@/components/founder/campaigns/BrandScanner'
import { CampaignGenerator } from '@/components/founder/campaigns/CampaignGenerator'
import { SYNTHEX_LAUNCH_LANES, type SynthexLaunchLane } from '@/lib/campaigns/launch-lanes'

function ArrowLeft({ size = 14, className, ...props }: { size?: number; className?: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  )
}

type Step = 'select' | 'scan' | 'generate'

interface ScanResult {
  profileId: string
  clientName: string
}

export default function NewCampaignPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('select')
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [launchLane, setLaunchLane] = useState<SynthexLaunchLane | null>(null)

  function handleScanComplete(profileId: string, clientName?: string) {
    setScan({ profileId, clientName: clientName ?? 'Your Brand' })
    setStep('generate')
  }

  function handleBrandSelected(profile: BrandProfileOption) {
    setLaunchLane(SYNTHEX_LAUNCH_LANES.find((lane) => lane.businessKey === profile.businessKey) ?? null)
    setScan({ profileId: profile.id, clientName: profile.clientName })
    setStep('generate')
  }

  function handleGenerated(campaignId: string) {
    router.push(`/founder/campaigns/${campaignId}`)
  }

  function handleBack() {
    setStep('select')
    setScan(null)
    setLaunchLane(null)
  }

  function handleScanNew() {
    setStep('scan')
    setScan(null)
    setLaunchLane(null)
  }

  function handleLaunchLane(lane: SynthexLaunchLane) {
    setLaunchLane(lane)
    setScan(null)
    setStep('scan')
  }

  const subtitle = step === 'select'
    ? 'Step 1 — Select child brand'
    : step === 'scan'
      ? 'Step 2 — Scan website for Brand DNA'
      : `Step 3 — Configure campaign for ${scan?.clientName}`

  return (
    <div className="p-6 flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/founder/campaigns"
          className="p-1.5 rounded-sm border transition-colors"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          aria-label="Back to campaigns"
        >
          <ArrowLeft size={14} />
        </Link>
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            New Campaign
          </h1>
          <p className="text-[12px]" style={{ color: 'var(--color-text-disabled)' }}>
            {subtitle}
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {(['select', 'scan', 'generate'] as const).map((s, i) => {
          const isComplete = (step === 'scan' && s === 'select') || (step === 'generate' && s !== 'generate')
          return <div key={s} className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-sm flex items-center justify-center text-[11px] font-medium"
              style={{
                background: step === s ? '#16a34a' : isComplete ? 'rgba(22, 163, 74,0.15)' : 'var(--surface-elevated)',
                color: step === s ? '#050505' : isComplete ? '#16a34a' : 'var(--color-text-disabled)',
              }}
            >
              {i + 1}
            </div>
            <span className="text-[12px]" style={{ color: step === s ? 'var(--color-text-primary)' : 'var(--color-text-disabled)' }}>
              {s === 'select' ? 'Brand' : s === 'scan' ? 'Scan' : 'Generate'}
            </span>
            {i < 2 && <div className="w-8 h-px" style={{ background: 'var(--color-border)' }} />}
          </div>
        })}
      </div>

      {/* Step content */}
      {step === 'select' && (
        <div className="flex flex-col gap-5">
          <section className="rounded-sm border border-[#16a34a]/20 bg-[#16a34a]/5 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#15803d]">
              Protected Synthex launch lanes
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {SYNTHEX_LAUNCH_LANES.map((lane) => (
                <button
                  key={lane.businessKey}
                  type="button"
                  onClick={() => handleLaunchLane(lane)}
                  className="rounded-sm border border-white/10 bg-[#fff7ec] p-4 text-left transition-colors hover:border-[#16a34a]/40"
                >
                  <span className="block text-[13px] font-semibold text-[#0A0A0A]">{lane.brandName}</span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-[#5f5f66]">{lane.purpose}</span>
                  <span className="mt-3 block text-[10px] uppercase tracking-wider text-[#15803d]">Connect Brand DNA →</span>
                </button>
              ))}
            </div>
          </section>
          <BrandProfileSelector onSelect={handleBrandSelected} onScanNew={handleScanNew} />
        </div>
      )}

      {step === 'scan' && (
        <BrandScanner
          onScanComplete={(profileId, clientName) => handleScanComplete(profileId, clientName)}
          initialClientName={launchLane?.brandName}
          initialWebsiteUrl={launchLane?.websiteUrl}
          businessKey={launchLane?.businessKey}
        />
      )}

      {step === 'generate' && scan && (
        <CampaignGenerator
          brandProfileId={scan.profileId}
          brandName={scan.clientName}
          initialTheme={launchLane?.pilotTheme}
          initialObjective={launchLane?.objective}
          initialPlatforms={launchLane ? [...launchLane.platforms] : undefined}
          onGenerated={handleGenerated}
          onBack={handleBack}
        />
      )}
    </div>
  )
}
