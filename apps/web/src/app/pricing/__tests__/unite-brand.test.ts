import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { HOME_HERO } from '@/components/public/home/copy'
import { TODAY } from '@/components/public/today-coming-data'
import { SIGNATURE_ADDON, STARTER_PLAN } from '@/lib/public-pricing'

const src = join(__dirname, '..', '..', '..')
const read = (p: string) => readFileSync(join(src, p), 'utf8')

describe('Unite Group brand only (UNI-3017)', () => {
  it('the home page no longer renders the restoration sister-company block', () => {
    expect(read('components/public/home/public-home.tsx')).not.toContain('<Story')
    expect(read('components/public/highlights.tsx')).not.toMatch(/Disaster Recovery|NRPG|#group/)
    expect(read('app/page.tsx')).not.toMatch(/Disaster Recovery|NRPG|CARSI|RestoreAssist/)
    expect(TODAY.map((t) => t.name)).toEqual(['Living business card', 'Starter plan', 'Email signatures'])
  })
  it('the login and forgot-password layout says Unite-Group, not PI CEO or Nexus', () => {
    const jsx = read('app/(auth)/layout.tsx').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    expect(jsx).toContain('Unite-Group')
    expect(jsx).not.toMatch(/pi-ceo-hero/)
    expect(jsx).not.toMatch(/pi[\s-]?ceo|Unite-Group Nexus/i)
    const login = read('app/(auth)/auth/login/page.tsx')
    expect(login).not.toMatch(/pi[\s-]?ceo|Unite-Group Nexus/i)
  })
  it('the home hero says Unite-Group, the agency, not Nexus or the CRM line', () => {
    // The live home renders its hero from HOME_HERO in home/home-page.tsx (hero.tsx is no longer on the page).
    const words = [HOME_HERO.wordmark, HOME_HERO.kicker, HOME_HERO.title, HOME_HERO.lead].join(' ')
    expect(words).not.toMatch(/Unite-Group Nexus|The CRM we are building/)
    expect(HOME_HERO.wordmark).toBe('Unite-Group')
    expect(HOME_HERO.lead).toContain('AI marketing agency')
    const page = read('components/public/home/home-page.tsx')
    for (const field of ['wordmark', 'title', 'lead']) expect(page).toContain(`{HOME_HERO.${field}}`)
  })
  it('llms.txt describes the Starter plan and no longer says there is no subscription', () => {
    const llms = readFileSync(join(src, '..', 'public', 'llms.txt'), 'utf8')
    expect(llms).not.toMatch(/no subscription|Only the video business card is on sale|CRM and operating system/)
    expect(llms).toContain('Starter plan')
    expect(llms).toContain(`$${STARTER_PLAN.priceAud} AUD a month`)
    expect(llms).toContain(`$${SIGNATURE_ADDON.priceAud} AUD each`)
    expect(llms).not.toMatch(/^- Prices on this page/m)
  })
})
