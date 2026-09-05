'use client'

import { useState, useCallback } from 'react'
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'

const PLATFORMS = ['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube'] as const
type Platform = (typeof PLATFORMS)[number]

const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube: 'YouTube',
}

type Objective = 'awareness' | 'engagement' | 'conversion' | 'retention'

const OBJECTIVE_LABELS: Record<Objective, string> = {
  awareness: 'Awareness',
  engagement: 'Engagement',
  conversion: 'Conversion',
  retention: 'Retention',
}

interface CampaignCreatedResponse {
  id: string
  theme: string
  objective: string
  status: string
}

interface CampaignGenerateResponse {
  assetsCreated: number
  assetsWithImages: number
  assetsFailed: number
}

type UIState = 'config' | 'generating' | 'complete'

export interface CampaignGeneratorProps {
  brandProfileId: string
  brandName: string
  initialTheme?: string
  initialObjective?: Objective
  initialPlatforms?: Platform[]
  onGenerated: (campaignId: string) => void
  onBack: () => void
}

export function CampaignGenerator({
  brandProfileId,
  brandName,
  initialTheme = '',
  initialObjective = 'awareness',
  initialPlatforms = [],
  onGenerated,
  onBack,
}: CampaignGeneratorProps) {
  const [uiState, setUiState] = useState<UIState>('config')
  const [theme, setTheme] = useState(initialTheme)
  const [objective, setObjective] = useState<Objective>(initialObjective)
  const [platforms, setPlatforms] = useState<Platform[]>(initialPlatforms)
  const [postCount, setPostCount] = useState(5)
  const [dateRangeStart, setDateRangeStart] = useState('')
  const [dateRangeEnd, setDateRangeEnd] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [generateResult, setGenerateResult] = useState<CampaignGenerateResponse | null>(null)

  const togglePlatform = useCallback((platform: Platform) => {
    setPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    )
  }, [])

  const canSubmit = theme.trim().length > 0 && platforms.length > 0

  const handleGenerate = useCallback(async () => {
    if (!canSubmit) return
    setError(null)
    setUiState('generating')

    try {
      // Step 1: Create the campaign record
      const createRes = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandProfileId,
          theme: theme.trim(),
          objective,
          platforms,
          postCount,
          dateRangeStart: dateRangeStart || undefined,
          dateRangeEnd: dateRangeEnd || undefined,
        }),
      })

      if (!createRes.ok) {
        const body = await createRes.text()
        throw new Error(body || 'Failed to create campaign')
      }

      const created = (await createRes.json()) as CampaignCreatedResponse
      setCampaignId(created.id)

      // Step 2: Kick off generation (may take up to 90s)
      const generateRes = await fetch(`/api/campaigns/${created.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!generateRes.ok) {
        const body = await generateRes.text()
        throw new Error(body || 'Generation failed')
      }

      const result = (await generateRes.json()) as CampaignGenerateResponse
      setGenerateResult(result)
      setUiState('complete')
      onGenerated(created.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setUiState('config')
    }
  }, [
    canSubmit,
    brandProfileId,
    theme,
    objective,
    platforms,
    postCount,
    dateRangeStart,
    dateRangeEnd,
    onGenerated,
  ])

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--mission-border)] rounded-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-[var(--color-text-secondary)] hover:text-[var(--mission-ink)] transition-colors text-[11px] flex items-center gap-1.5"
        >
          <ArrowLeft size={13} />
          Back
        </button>
        <span className="text-[var(--color-text-muted)] text-[11px]">/</span>
        <span className="text-[var(--mission-ink)] text-[13px] font-medium">{brandName}</span>
        <span className="text-[var(--color-text-muted)] text-[11px]">/</span>
        <span className="text-[var(--color-text-secondary)] text-[13px]">New Campaign</span>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="text-[11px] px-3 py-2 rounded-sm border"
          style={{
            background: 'rgba(239,68,68,0.08)',
            borderColor: 'rgba(239,68,68,0.25)',
            color: 'var(--color-danger)',
          }}
        >
          {error}
        </div>
      )}

      {/* Config state */}
      {uiState === 'config' && (
        <div className="space-y-5">
          <h2 className="text-[var(--mission-ink)] text-[15px] font-medium">Configure Campaign</h2>

          {/* Theme */}
          <div className="space-y-1.5">
            <label
              className="text-[10px] uppercase tracking-[0.15em] block"
              style={{ color: 'var(--mission-muted)' }}
            >
              Theme <span style={{ color: 'var(--mission-blue)' }}>*</span>
            </label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g. Summer Sale, Product Launch, Brand Awareness"
              className="w-full text-[12px] px-3 py-2.5 rounded-sm border outline-hidden transition-colors"
              style={{
                background: 'var(--mission-canvas)',
                borderColor: theme.trim() ? 'var(--mission-border)' : 'var(--mission-border)',
                color: 'var(--mission-ink)',
              }}
            />
          </div>

          {/* Objective */}
          <div className="space-y-1.5">
            <label
              className="text-[10px] uppercase tracking-[0.15em] block"
              style={{ color: 'var(--mission-muted)' }}
            >
              Objective
            </label>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value as Objective)}
              className="w-full text-[12px] px-3 py-2.5 rounded-sm border outline-hidden appearance-none"
              style={{
                background: 'var(--mission-canvas)',
                borderColor: 'var(--mission-border)',
                color: 'var(--mission-ink)',
              }}
            >
              {(Object.keys(OBJECTIVE_LABELS) as Objective[]).map((key) => (
                <option key={key} value={key}>
                  {OBJECTIVE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          {/* Platforms */}
          <div className="space-y-2">
            <label
              className="text-[10px] uppercase tracking-[0.15em] block"
              style={{ color: 'var(--mission-muted)' }}
            >
              Platforms <span style={{ color: 'var(--mission-blue)' }}>*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => {
                const checked = platforms.includes(platform)
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => togglePlatform(platform)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-sm border text-[11px] transition-colors"
                    style={{
                      background: checked ? 'color-mix(in srgb, var(--mission-blue) 8%, transparent)' : 'var(--mission-raised)',
                      borderColor: checked ? 'color-mix(in srgb, var(--mission-blue) 35%, transparent)' : 'var(--mission-border)',
                      color: checked ? 'var(--mission-blue)' : 'var(--mission-muted)',
                    }}
                  >
                    {/* Custom checkbox dot */}
                    <span
                      className="w-3 h-3 rounded-[2px] border flex items-center justify-center shrink-0"
                      style={{
                        background: checked ? 'var(--mission-blue)' : 'transparent',
                        borderColor: checked ? 'var(--mission-blue)' : 'var(--mission-border)',
                      }}
                    >
                      {checked && (
                        <svg
                          width="8"
                          height="6"
                          viewBox="0 0 8 6"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M1 3L3 5L7 1"
                            stroke="var(--mission-blue-ink)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    {PLATFORM_LABELS[platform]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Post count */}
          <div className="space-y-1.5">
            <label
              className="text-[10px] uppercase tracking-[0.15em] block"
              style={{ color: 'var(--mission-muted)' }}
            >
              Number of Posts
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={postCount}
              onChange={(e) =>
                setPostCount(Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 1)))
              }
              className="w-24 text-[12px] px-3 py-2.5 rounded-sm border outline-hidden"
              style={{
                background: 'var(--mission-canvas)',
                borderColor: 'var(--mission-border)',
                color: 'var(--mission-ink)',
              }}
            />
          </div>

          {/* Date range */}
          <div className="space-y-1.5">
            <label
              className="text-[10px] uppercase tracking-[0.15em] block"
              style={{ color: 'var(--mission-muted)' }}
            >
              Date Range (optional)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
                className="text-[12px] px-3 py-2.5 rounded-sm border outline-hidden"
                style={{
                  background: 'var(--mission-canvas)',
                  borderColor: 'var(--mission-border)',
                  color: dateRangeStart ? 'var(--mission-ink)' : 'var(--mission-muted)',
                }}
              />
              <span className="text-[11px]" style={{ color: 'var(--mission-muted)' }}>
                to
              </span>
              <input
                type="date"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
                className="text-[12px] px-3 py-2.5 rounded-sm border outline-hidden"
                style={{
                  background: 'var(--mission-canvas)',
                  borderColor: 'var(--mission-border)',
                  color: dateRangeEnd ? 'var(--mission-ink)' : 'var(--mission-muted)',
                }}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-1">
            <button
              onClick={handleGenerate}
              disabled={!canSubmit}
              className="bg-[var(--mission-blue)] text-[var(--mission-blue-ink)] font-medium rounded-sm px-6 py-2.5 text-[13px] transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Generate Campaign
            </button>
            {!canSubmit && (
              <p className="mt-2 text-[10px]" style={{ color: 'var(--mission-muted)' }}>
                Enter a theme and select at least one platform to continue.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Generating state */}
      {uiState === 'generating' && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--mission-blue)' }} />
          <div className="text-center space-y-1">
            <p className="text-[13px]" style={{ color: 'var(--mission-ink)' }}>
              Generating copy and images...
            </p>
            <p className="text-[11px]" style={{ color: 'var(--mission-muted)' }}>
              This may take up to 90 seconds. Please wait.
            </p>
          </div>
        </div>
      )}

      {/* Complete state */}
      {uiState === 'complete' && generateResult && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} style={{ color: 'var(--mission-blue)' }} />
            <h2 className="text-[var(--mission-ink)] text-[15px] font-medium">Campaign Generated</h2>
          </div>

          {/* Stats card */}
          <div
            className="rounded-sm border p-5 space-y-4"
            style={{
              background: 'color-mix(in srgb, var(--mission-blue) 3%, transparent)',
              borderColor: 'color-mix(in srgb, var(--mission-blue) 15%, transparent)',
            }}
          >
            <p className="text-[11px]" style={{ color: 'var(--mission-muted)' }}>
              Theme:{' '}
              <span style={{ color: 'var(--mission-ink)' }}>{theme}</span>
            </p>

            <div className="grid grid-cols-3 gap-4">
              {/* Assets created */}
              <div className="space-y-1 text-center">
                <p className="text-[22px] font-semibold tabular-nums" style={{ color: 'var(--mission-blue)' }}>
                  {generateResult.assetsCreated}
                </p>
                <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: 'var(--mission-muted)' }}>
                  Assets Created
                </p>
              </div>

              {/* Assets with images */}
              <div className="space-y-1 text-center">
                <p className="text-[22px] font-semibold tabular-nums" style={{ color: 'var(--mission-ink)' }}>
                  {generateResult.assetsWithImages}
                </p>
                <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: 'var(--mission-muted)' }}>
                  With Images
                </p>
              </div>

              {/* Failed */}
              <div className="space-y-1 text-center">
                <p
                  className="text-[22px] font-semibold tabular-nums"
                  style={{
                    color: generateResult.assetsFailed > 0 ? 'var(--color-danger)' : 'var(--mission-muted)',
                  }}
                >
                  {generateResult.assetsFailed}
                </p>
                <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: 'var(--mission-muted)' }}>
                  Failed
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => campaignId && onGenerated(campaignId)}
              className="bg-[var(--mission-blue)] text-[var(--mission-blue-ink)] font-medium rounded-sm px-6 py-2.5 text-[13px] transition-opacity"
            >
              View Campaign
            </button>
            <button
              onClick={onBack}
              className="text-[var(--color-text-secondary)] hover:text-[var(--mission-ink)] transition-colors text-[12px]"
            >
              Back to Campaigns
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
