// UNI-2373 P9 — proves the weekly review is dormant by default.
// The gate is the reason merging the route's fixes arms nothing.

import { describe, it, expect } from 'vitest'
import { isWeeklyReviewArmed } from '../arming'

describe('isWeeklyReviewArmed — dormant by default (founder/Board gate)', () => {
  it('is false when the flag is unset — the production default', () => {
    expect(isWeeklyReviewArmed({} as NodeJS.ProcessEnv)).toBe(false)
  })

  it('is false for every truthy-looking value that is not exactly "1"', () => {
    for (const v of ['true', 'TRUE', 'yes', 'on', 'armed', '0', '', ' 1']) {
      expect(isWeeklyReviewArmed({ PI_CEO_WEEKLY_REVIEW_LIVE: v } as NodeJS.ProcessEnv)).toBe(false)
    }
  })

  it('is true only for the exact string "1"', () => {
    expect(isWeeklyReviewArmed({ PI_CEO_WEEKLY_REVIEW_LIVE: '1' } as NodeJS.ProcessEnv)).toBe(true)
  })
})
