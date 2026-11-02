// An in-memory stand-in for the service client, for the card account tests. It holds rows, applies eq filters and the
// deactivated-card rule the database trigger enforces. The real database behaviour has its own proof: scripts/card-staff-db-proof.sh.
import { hashCardToken, type Admin } from '../staff-actions'

export type Row = Record<string, unknown>

export function token(seed: string): string {
  return seed.padEnd(43, 'x')
}

export function makeStore() {
  const tables: Record<string, Row[]> = {
    card_orders: [],
    card_business_accounts: [],
    card_staff_cards: [],
  }
  const failReads = { on: false }
  const client = {
    from(name: string) {
      const rows = tables[name]
      if (!rows) throw new Error(`unexpected table ${name}`)
      const filters: Array<[string, unknown]> = []
      let patch: Row | null = null
      const match = () => rows.filter((r) => filters.every(([k, v]) => (v === null ? r[k] == null : r[k] === v)))
      const run = () => {
        if (failReads.on) return { data: null, error: { message: 'read failed' } }
        const hit = match()
        if (patch) {
          for (const r of hit) {
            if (r.status === 'deactivated') return { data: null, error: { message: 'card_staff_card_deactivated' } }
            Object.assign(r, patch)
            if (patch.status === 'deactivated') r.token_hash = null
          }
        }
        return { data: hit.map((r) => ({ ...r })), error: null }
      }
      const query = {
        select: () => query,
        eq: (k: string, v: unknown) => {
          filters.push([k, v])
          return query
        },
        is: (k: string, v: unknown) => {
          filters.push([k, v])
          return query
        },
        order: () => query,
        maybeSingle: async () => {
          const res = run()
          return { data: res.data?.[0] ?? null, error: res.error }
        },
        update: (p: Row) => {
          patch = p
          return query
        },
        insert: async (row: Row) => {
          const unique = name === 'card_business_accounts' && rows.some((r) => r.order_id === row.order_id)
          if (unique) return { data: null, error: { code: '23505', message: 'duplicate' } }
          rows.push({ id: `${name}-${rows.length + 1}`, ...row })
          return { data: null, error: null }
        },
        then: (resolve: (v: unknown) => unknown) => resolve(run()),
      }
      return query
    },
    async rpc(fn: string, args: Record<string, string>) {
      if (fn === 'card_provision_staff_cards') {
        const order = tables.card_orders.find((o) => o.id === args.p_order_id)
        if (!order) return { data: null, error: { message: 'card_provision_not_a_staff_card_order' } }
        let added = 0
        for (let seat = 1; seat <= (order.quantity as number); seat++) {
          if (!tables.card_staff_cards.some((c) => c.order_id === order.id && c.seat_no === seat)) {
            tables.card_staff_cards.push({ id: `seat-${order.id}-${seat}`, order_id: order.id, account_id: args.p_account_id, seat_no: seat, status: 'active', founder_id: order.founder_id, rounds_included: 3 })
            added++
          }
        }
        return { data: added, error: null }
      }
      if (fn === 'card_staff_public') {
        const card = tables.card_staff_cards.find((c) => c.card_slug === args.p_slug && c.status === 'active' && c.staff_name)
        const account = card && tables.card_business_accounts.find((a) => a.id === card.account_id)
        if (!card || !account) return { data: [], error: null }
        return { data: [{ ...account, card_slug: card.card_slug, staff_name: card.staff_name, photo_url: card.photo_url ?? null, mobile: card.mobile ?? null }], error: null }
      }
      throw new Error(`unexpected rpc ${fn}`)
    },
  }
  return { tables, failReads, admin: client as unknown as Admin, reader: client as never }
}

export const OWNER_A = token('ownerA')
export const OWNER_B = token('ownerB')
export const STAFF_A1 = token('staffA1')
export const STAFF_A2 = token('staffA2')
export const STAFF_B1 = token('staffB1')

const staff = (id: string, accountId: string, tok: string, slug: string, extra: Row = {}): Row => ({
  id,
  account_id: accountId,
  founder_id: 'f',
  card_slug: slug,
  token_hash: hashCardToken(tok),
  status: 'active',
  rounds_included: 3,
  staff_name: `Name of ${id}`,
  photo_url: null,
  mobile: null,
  ...extra,
})

export const ID_A1 = '00000000-0000-4000-8000-0000000000a1'
export const ID_A2 = '00000000-0000-4000-8000-0000000000a2'
export const ID_B1 = '00000000-0000-4000-8000-0000000000b1'

/** Two accounts, each with its owner link; A has two staff cards and B has one. */
export function twoAccounts() {
  const store = makeStore()
  const business = { rounds_included: 10, business_name: 'A Pty', logo_url: null, phone: null, email: null, website: null, address: null, offer: null }
  store.tables.card_business_accounts.push(
    { id: 'acct-a', founder_id: 'f', owner_token_hash: hashCardToken(OWNER_A), ...business },
    { id: 'acct-b', founder_id: 'f', owner_token_hash: hashCardToken(OWNER_B), ...business, business_name: 'B Pty' },
  )
  store.tables.card_staff_cards.push(
    staff(ID_A1, 'acct-a', STAFF_A1, 's-00000000000000a1'),
    staff(ID_A2, 'acct-a', STAFF_A2, 's-00000000000000a2'),
    staff(ID_B1, 'acct-b', STAFF_B1, 's-00000000000000b1'),
  )
  return store
}
