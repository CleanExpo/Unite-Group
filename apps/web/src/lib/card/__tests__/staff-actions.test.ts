import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getStaffCard } from '../published'
import { cleanField, handleCardManage, hashCardToken, manageLink, newCardToken } from '../staff-actions'
import { BUSINESS_FIELDS, STAFF_FIELDS, type CardField } from '../staff-permissions'
import { ID_A1, ID_A2, ID_B1, OWNER_A, OWNER_B, STAFF_A1, STAFF_A2, STAFF_B1, token, twoAccounts } from './staff-fake'

const VALUE: Record<CardField, string> = {
  business_name: 'Changed Pty',
  logo_url: 'https://cdn.example.invalid/logo.png',
  phone: '07 3000 0000',
  email: 'hello@example.invalid',
  website: 'https://example.invalid',
  address: '1 Queen Street, Brisbane City QLD 4000',
  offer: 'Ten per cent off first jobs',
  staff_name: 'Changed Name',
  photo_url: 'https://cdn.example.invalid/me.jpg',
  mobile: '0400 111 222',
}

// Target throughout: staff card A1 on account A.
const ACTORS = [
  ['owner', OWNER_A],
  ['own staff', STAFF_A1],
  ['other staff, same account', STAFF_A2],
  ['other staff, other account', STAFF_B1],
  ['other owner', OWNER_B],
  ['anonymous (no token)', undefined],
  ['anonymous (made-up token)', token('nobody')],
] as const

let store: ReturnType<typeof twoAccounts>
const accountA = () => store.tables.card_business_accounts[0]
const cardA1 = () => store.tables.card_staff_cards[0]
const post = (body: Record<string, unknown>) => handleCardManage(store.admin, body)

beforeEach(() => {
  store = twoAccounts()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('the server refuses or applies each edit, field by field', () => {
  describe.each(ACTORS)('%s', (label, tok) => {
    it.each(STAFF_FIELDS.map((f) => [f]))('staff field %s on card A1', async (field) => {
      const before = cardA1()[field]
      const res = await post({ token: tok, action: 'update_staff', staff_id: ID_A1, fields: { [field]: VALUE[field] } })
      if (label === 'own staff') {
        expect(res.status).toBe(200)
        expect(cardA1()[field]).toBe(VALUE[field])
      } else {
        expect(res.status).toBeGreaterThanOrEqual(403)
        expect(cardA1()[field]).toBe(before)
      }
    })

    it.each(BUSINESS_FIELDS.map((f) => [f]))('business field %s on account A', async (field) => {
      const before = accountA()[field]
      // An account id sent by a caller must be ignored, so it cannot aim the write at A.
      const beforeB = store.tables.card_business_accounts[1][field]
      const res = await post({ token: tok, action: 'update_business', account_id: 'acct-a', fields: { [field]: VALUE[field] } })
      if (label === 'owner') {
        expect(res.status).toBe(200)
        expect(accountA()[field]).toBe(VALUE[field])
        expect(store.tables.card_business_accounts[1][field]).toBe(beforeB)
      } else if (label === 'other owner') {
        // The action has no target field: another owner's link can only ever change their own account, never A.
        expect(res.status).toBe(200)
        expect(accountA()[field]).toBe(before)
        expect(store.tables.card_business_accounts[1][field]).toBe(VALUE[field])
      } else {
        expect(res.status).toBeGreaterThanOrEqual(403)
        expect(accountA()[field]).toBe(before)
        expect(store.tables.card_business_accounts[1][field]).toBe(beforeB)
      }
    })
  })

  it('refuses a whole change when one key is not allowed, so nothing slips through alongside it', async () => {
    const res = await post({ token: STAFF_A1, action: 'update_staff', staff_id: ID_A1, fields: { staff_name: 'Ok', business_name: 'Hijack' } })
    expect(res.status).toBe(403)
    expect(cardA1().staff_name).toBe('Name of ' + ID_A1)
    expect(accountA().business_name).toBe('A Pty')
  })

  it.each([['token_hash'], ['status'], ['account_id'], ['card_slug'], ['rounds_included'], ['founder_id']])(
    'refuses the internal column %s from anyone, including the owner and the card holder',
    async (column) => {
      const before = { ...cardA1() }
      for (const tok of [STAFF_A1, OWNER_A]) {
        const res = await post({ token: tok, action: 'update_staff', staff_id: ID_A1, fields: { [column]: 'x' } })
        expect(res.status).toBe(403)
      }
      expect(cardA1()).toEqual(before)
    },
  )

  it('does not let the owner change a staff member\'s own fields', async () => {
    const res = await post({ token: OWNER_A, action: 'update_staff', staff_id: ID_A1, fields: { staff_name: 'Set by owner' } })
    expect(res.status).toBe(403)
  })
})

describe('propagation', () => {
  it('shows an owner change on every staff card of that account, and no other account, on the next read', async () => {
    store.tables.card_staff_cards.forEach((c) => { c.status = 'active' })
    const read = async (slug: string) => getStaffCard(slug, store.reader)
    expect((await read('s-00000000000000a1'))?.businessName).toBe('A Pty')
    const res = await post({ token: OWNER_A, action: 'update_business', fields: { business_name: 'New Name', phone: '07 3000 0000', website: 'https://new.example.invalid' } })
    expect(res.status).toBe(200)
    for (const slug of ['s-00000000000000a1', 's-00000000000000a2']) {
      const card = await read(slug)
      expect(card?.businessName).toBe('New Name')
      expect(card?.staff?.website).toBe('https://new.example.invalid')
    }
    expect((await read('s-00000000000000b1'))?.businessName).toBe('B Pty')
  })

  it('keeps each staff member\'s own name on their own card', async () => {
    await post({ token: OWNER_A, action: 'update_business', fields: { business_name: 'New Name' } })
    expect((await getStaffCard('s-00000000000000a1', store.reader))?.displayName).toBe('Name of ' + ID_A1)
    expect((await getStaffCard('s-00000000000000a2', store.reader))?.displayName).toBe('Name of ' + ID_A2)
  })

  it('uses the mobile on the card when set, else the business phone', async () => {
    await post({ token: OWNER_A, action: 'update_business', fields: { phone: '07 3000 0000' } })
    expect((await getStaffCard('s-00000000000000a1', store.reader))?.phone).toBe('07 3000 0000')
    await post({ token: STAFF_A1, action: 'update_staff', staff_id: ID_A1, fields: { mobile: '0400 111 222' } })
    expect((await getStaffCard('s-00000000000000a1', store.reader))?.phone).toBe('0400 111 222')
  })
})

describe('deactivation and the new-card rule', () => {
  it('lets the owner deactivate their own staff card: it leaves the web and its link stops working', async () => {
    const res = await post({ token: OWNER_A, action: 'deactivate_staff', staff_id: ID_A1 })
    expect(res.status).toBe(200)
    expect(cardA1().status).toBe('deactivated')
    expect(await getStaffCard('s-00000000000000a1', store.reader)).toBeNull()
    const load = await post({ token: STAFF_A1, action: 'load' })
    expect(load.status).toBe(404)
  })

  it('leaves the other cards on the account alone', async () => {
    await post({ token: OWNER_A, action: 'deactivate_staff', staff_id: ID_A1 })
    expect((await post({ token: STAFF_A2, action: 'load' })).status).toBe(200)
    expect(await getStaffCard('s-00000000000000a2', store.reader)).not.toBeNull()
  })

  it.each([
    ['the card holder', STAFF_A1, ID_A1],
    ['another staff member', STAFF_A2, ID_A1],
    ['another owner', OWNER_B, ID_A1],
    ['a made-up token', token('nobody'), ID_A1],
  ])('refuses deactivation by %s', async (_n, tok, id) => {
    const res = await post({ token: tok, action: 'deactivate_staff', staff_id: id })
    expect(res.status).toBeGreaterThanOrEqual(403)
    expect(cardA1().status).toBe('active')
  })

  it('freezes a deactivated card: no edit, no new link, no second deactivation, even for the owner', async () => {
    await post({ token: OWNER_A, action: 'deactivate_staff', staff_id: ID_A1 })
    const name = cardA1().staff_name
    for (const body of [
      { action: 'issue_staff_link', staff_id: ID_A1 },
      { action: 'deactivate_staff', staff_id: ID_A1 },
      { action: 'update_staff', staff_id: ID_A1, fields: { staff_name: 'New Person' } },
    ]) {
      expect((await post({ token: OWNER_A, ...body })).status).toBe(403)
    }
    expect(cardA1().staff_name).toBe(name)
    expect(cardA1().token_hash).toBeNull()
  })

  it('offers no way to add a seat: a new staff member needs a new paid card', async () => {
    const res = await post({ token: OWNER_A, action: 'create_staff_card', fields: { staff_name: 'Free Card' } })
    expect(res.status).toBe(400)
    expect(store.tables.card_staff_cards).toHaveLength(3)
  })
})

describe('staff links', () => {
  it('issues a link that works once made, kills the old one, and stores only a hash', async () => {
    const res = await post({ token: OWNER_A, action: 'issue_staff_link', staff_id: ID_A1 })
    expect(res.status).toBe(200)
    const link = res.body.issued_link as string
    const fresh = new URL(link).hash.replace('#k=', '')
    expect(cardA1().token_hash).toBe(hashCardToken(fresh))
    expect(JSON.stringify(store.tables)).not.toContain(fresh)
    expect((await post({ token: fresh, action: 'load' })).status).toBe(200)
    expect((await post({ token: STAFF_A1, action: 'load' })).status).toBe(404)
  })

  it.each([
    ['another owner', OWNER_B, ID_A1],
    ['the owner, for a card on another account', OWNER_A, ID_B1],
    ['a staff member, for themselves', STAFF_A1, ID_A1],
  ])('refuses a link to %s', async (_n, tok, id) => {
    const before = JSON.stringify(store.tables.card_staff_cards)
    const res = await post({ token: tok, action: 'issue_staff_link', staff_id: id })
    expect(res.status).toBe(403)
    expect(res.body.issued_link).toBeUndefined()
    expect(JSON.stringify(store.tables.card_staff_cards)).toBe(before)
  })

  it('never returns a token hash to anyone', async () => {
    for (const tok of [OWNER_A, STAFF_A1]) {
      const body = JSON.stringify((await post({ token: tok, action: 'load' })).body)
      expect(body).not.toContain('token_hash')
      expect(body).not.toContain(hashCardToken(STAFF_A1))
    }
  })

  it('gives a staff member their own card and not the owner\'s business fields or the other cards', async () => {
    const { body } = await post({ token: STAFF_A1, action: 'load' })
    expect(body.role).toBe('staff')
    expect(body.staff).toBeUndefined()
    expect(body.business).toBeUndefined()
    expect((body.card as { id: string }).id).toBe(ID_A1)
  })

  it('puts the token in the fragment, so it is never in a request line or a Referer header', () => {
    const { token: t } = newCardToken()
    const url = new URL(manageLink(t))
    expect(url.search).toBe('')
    expect(url.pathname).toBe('/cards/manage')
    expect(url.hash).toBe(`#k=${t}`)
  })
})

describe('input and failure', () => {
  it.each([
    ['logo_url', 'javascript:alert(1)'],
    ['website', 'http://plain.example.invalid'],
    ['photo_url', 'data:image/png;base64,AAAA'],
    ['photo_url', 'https://user:pass@example.invalid/a.png'],
    ['website', 'https://example.invalid/"onmouseover=1'],
    ['mobile', 'call me'],
    ['phone', '<script>'],
    ['email', 'not-an-email'],
    ['business_name', '   '],
    ['staff_name', ''],
    ['staff_name', 'x'.repeat(81)],
    ['offer', 'x'.repeat(281)],
    ['address', 7],
  ] as Array<[CardField, unknown]>)('refuses %s = %j', (field, value) => {
    expect(cleanField(field, value)).toBeUndefined()
  })

  it('stores nothing and says which field when a value is bad', async () => {
    const res = await post({ token: OWNER_A, action: 'update_business', fields: { website: 'javascript:alert(1)' } })
    expect(res.status).toBe(400)
    expect(res.body.field).toBe('website')
    expect(accountA().website).toBeNull()
  })

  it('clears an optional field on empty, and never clears a name', () => {
    expect(cleanField('offer', '  ')).toBeNull()
    expect(cleanField('business_name', null)).toBeUndefined()
    expect(cleanField('staff_name', null)).toBeUndefined()
  })

  it('answers the same for a malformed, unknown or missing token', async () => {
    const answers = await Promise.all(['short', token('nobody'), undefined, 42].map((t) => post({ token: t, action: 'load' })))
    for (const a of answers) expect(a).toEqual(answers[0])
    expect(answers[0].status).toBe(404)
  })

  it('reports a failed read as a 500, never as an invalid link', async () => {
    store.failReads.on = true
    const res = await post({ token: OWNER_A, action: 'load' })
    expect(res.status).toBe(500)
  })

  it('refuses an unknown action', async () => {
    expect((await post({ token: OWNER_A, action: 'drop_everything' })).status).toBe(400)
  })
})
