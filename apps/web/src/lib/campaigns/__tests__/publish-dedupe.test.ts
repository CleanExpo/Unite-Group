import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CAMPAIGN_DRAFT_CONFLICT_COLUMNS,
  isCampaignPublishDedupeEnabled,
} from '../publish-dedupe'
import { CAMPAIGN_DEDUPE_MIGRATION as MIGRATION, migrationUniqueColumns } from '@/test/campaign-publish-store'

describe('campaign publish dedupe switch', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('is off when unset', () => {
    vi.stubEnv('CAMPAIGN_PUBLISH_DEDUPE_ENABLED', undefined as unknown as string)
    expect(isCampaignPublishDedupeEnabled()).toBe(false)
  })

  it.each(['', '1', 'TRUE', 'True', 'yes', ' true', 'true '])('is off for %j', (value) => {
    vi.stubEnv('CAMPAIGN_PUBLISH_DEDUPE_ENABLED', value)
    expect(isCampaignPublishDedupeEnabled()).toBe(false)
  })

  it("is on only for exactly 'true'", () => {
    vi.stubEnv('CAMPAIGN_PUBLISH_DEDUPE_ENABLED', 'true')
    expect(isCampaignPublishDedupeEnabled()).toBe(true)
  })
})

describe('conflict target is pinned to the migration', () => {
  it('declares exactly one unique key, on the columns the insert names', () => {
    expect(migrationUniqueColumns()).toEqual([[...CAMPAIGN_DRAFT_CONFLICT_COLUMNS]])
  })

  it('adds both conflict columns as nullable, so existing rows cannot conflict', () => {
    const sql = readFileSync(MIGRATION, 'utf8')
    for (const column of CAMPAIGN_DRAFT_CONFLICT_COLUMNS) {
      expect(sql).toMatch(new RegExp(`ADD COLUMN IF NOT EXISTS ${column} \\w+ NULL`, 'i'))
    }
    expect(sql).not.toMatch(/NOT NULL/i)
  })
})
