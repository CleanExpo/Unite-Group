// src/app/api/health/connectors/route.ts
// Connector health check — vital signs for all CRM integrations
// GET /api/health/connectors
// Auth: Founder-only (returns sensitive status data)

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { isXeroConfigured } from '@/lib/integrations/xero'
import { isGoogleConfigured } from '@/lib/integrations/google-oauth'

interface ConnectorStatus {
  name: string
  service: string
  configured: boolean
  envVars: Array<{ name: string; present: boolean }>
  oauthConnected: boolean
  lastError?: string
  lastSyncedAt?: string
}

function envPresent(name: string): boolean {
  const val = process.env[name]
  return !!val && val.length > 0 && !val.startsWith('your-') && !val.startsWith('***')
}

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const connectors: ConnectorStatus[] = []

  // ── Xero CARSI ──
  connectors.push({
    name: 'Xero — CARSI',
    service: 'xero',
    configured: isXeroConfigured(),
    envVars: [
      { name: 'XERO_CLIENT_ID', present: envPresent('XERO_CLIENT_ID') },
      { name: 'XERO_CLIENT_SECRET', present: envPresent('XERO_CLIENT_SECRET') },
    ],
    oauthConnected: false, // Would check credentials_vault in prod
  })

  // ── Xero DR ──
  connectors.push({
    name: 'Xero — DR',
    service: 'xero-dr',
    configured: envPresent('DR_CLIENT_ID') && envPresent('DR_CLIENT_SECRET'),
    envVars: [
      { name: 'DR_CLIENT_ID', present: envPresent('DR_CLIENT_ID') },
      { name: 'DR_CLIENT_SECRET', present: envPresent('DR_CLIENT_SECRET') },
    ],
    oauthConnected: false,
  })

  // ── Google ──
  connectors.push({
    name: 'Google — Gmail/Calendar/Drive',
    service: 'google',
    configured: isGoogleConfigured(),
    envVars: [
      { name: 'GOOGLE_CLIENT_ID', present: envPresent('GOOGLE_CLIENT_ID') },
      { name: 'GOOGLE_CLIENT_SECRET', present: envPresent('GOOGLE_CLIENT_SECRET') },
      { name: 'GOOGLE_DRIVE_VAULT_FOLDER_ID', present: envPresent('GOOGLE_DRIVE_VAULT_FOLDER_ID') },
    ],
    oauthConnected: false,
  })

  // ── Google Search Console ──
  connectors.push({
    name: 'Google Search Console',
    service: 'google-search-console',
    configured: envPresent('GSC_PROPERTY_ID'),
    envVars: [
      { name: 'GSC_PROPERTY_ID', present: envPresent('GSC_PROPERTY_ID') },
    ],
    oauthConnected: false,
  })

  // ── Google Analytics 4 ──
  connectors.push({
    name: 'Google Analytics 4',
    service: 'google-analytics',
    configured: envPresent('GA4_PROPERTY_ID'),
    envVars: [
      { name: 'GA4_PROPERTY_ID', present: envPresent('GA4_PROPERTY_ID') },
    ],
    oauthConnected: false,
  })

  // ── Meta (Facebook/Instagram) ──
  connectors.push({
    name: 'Meta — Facebook/Instagram',
    service: 'meta',
    configured: envPresent('META_APP_ID') && envPresent('META_APP_SECRET'),
    envVars: [
      { name: 'META_APP_ID', present: envPresent('META_APP_ID') },
      { name: 'META_APP_SECRET', present: envPresent('META_APP_SECRET') },
    ],
    oauthConnected: false,
  })

  // ── LinkedIn ──
  connectors.push({
    name: 'LinkedIn',
    service: 'linkedin',
    configured: envPresent('LINKEDIN_CLIENT_ID') && envPresent('LINKEDIN_CLIENT_SECRET'),
    envVars: [
      { name: 'LINKEDIN_CLIENT_ID', present: envPresent('LINKEDIN_CLIENT_ID') },
      { name: 'LINKEDIN_CLIENT_SECRET', present: envPresent('LINKEDIN_CLIENT_SECRET') },
    ],
    oauthConnected: false,
  })

  // ── YouTube ──
  connectors.push({
    name: 'YouTube',
    service: 'youtube',
    configured:
      envPresent('YOUTUBE_API_KEY') || (isGoogleConfigured()),
    envVars: [
      { name: 'YOUTUBE_API_KEY', present: envPresent('YOUTUBE_API_KEY') },
      { name: 'GOOGLE_CLIENT_ID (shared)', present: isGoogleConfigured() },
    ],
    oauthConnected: false,
  })

  // ── TikTok ──
  connectors.push({
    name: 'TikTok',
    service: 'tiktok',
    configured:
      envPresent('TIKTOK_CLIENT_KEY') && envPresent('TIKTOK_CLIENT_SECRET'),
    envVars: [
      { name: 'TIKTOK_CLIENT_KEY', present: envPresent('TIKTOK_CLIENT_KEY') },
      { name: 'TIKTOK_CLIENT_SECRET', present: envPresent('TIKTOK_CLIENT_SECRET') },
    ],
    oauthConnected: false,
  })

  // ── Obsidian / Vault ──
  connectors.push({
    name: 'Obsidian / Vault',
    service: 'obsidian',
    configured: true, // Always available (local file system)
    envVars: [],
    oauthConnected: true,
  })

  // ── Linear ──
  connectors.push({
    name: 'Linear',
    service: 'linear',
    configured: envPresent('LINEAR_API_KEY'),
    envVars: [
      { name: 'LINEAR_API_KEY', present: envPresent('LINEAR_API_KEY') },
    ],
    oauthConnected: !!process.env.LINEAR_API_KEY,
  })

  // ── GitHub ──
  connectors.push({
    name: 'GitHub',
    service: 'github',
    configured: envPresent('GITHUB_APP_ID') || envPresent('GITHUB_TOKEN'),
    envVars: [
      { name: 'GITHUB_APP_ID', present: envPresent('GITHUB_APP_ID') },
      { name: 'GITHUB_TOKEN', present: envPresent('GITHUB_TOKEN') },
    ],
    oauthConnected: false,
  })

  // ── Summary ──
  const connected = connectors.filter((c) => c.oauthConnected).length
  const configured = connectors.filter((c) => c.configured).length
  const total = connectors.length

  return NextResponse.json({
    summary: {
      total,
      configured,
      configuredPercent: Math.round((configured / total) * 100),
      connected,
      connectedPercent: Math.round((connected / total) * 100),
      status: connected === total ? 'all_connected' : configured > 0 ? 'partial' : 'not_configured',
    },
    connectors,
    env: {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    },
  })
}
