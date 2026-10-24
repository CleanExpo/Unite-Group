import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import PrivacyPolicyPage from '../page'

// The policy may only promise what the erasure delivers: the enquiry alert log and
// timeline rows (erase_lead_alert_data) plus the two manual steps it names.
describe('privacy policy erasure wording', () => {
  const html = renderToStaticMarkup(<PrivacyPolicyPage />).replace(/\s+/g, ' ')
  it('names each thing the erasure step removes', () => {
    for (const phrase of ['deletes the enquiry record', 'alert delivery log', 'activity timeline entries', 'alert mailbox']) {
      expect(html).toContain(phrase)
    }
  })
  it('promises nothing the erasure function does not delete', () => {
    const sql = readFileSync('supabase/migrations/20261025000000_alert_erasure.sql', 'utf8')
    expect(sql).toContain('delete from public.alert_delivery_log')
    expect(sql).toContain('delete from public.agent_actions')
  })
})
