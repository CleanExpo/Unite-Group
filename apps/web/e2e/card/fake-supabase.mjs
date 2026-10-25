// Test-only stand-in for the Supabase REST API (PostgREST), used by playwright.card.config.ts.
// It serves exactly what the /c/[slug] card needs and nothing else, so the card browser proofs
// never touch a real Supabase project or the network. Phone numbers are ACMA-reserved fictional numbers.
//   GET  /rest/v1/card_profiles?card_slug=eq.<slug>   -> the seeded card as an array or a single object (by Accept), empty/406 when unknown
//   POST /rest/v1/rpc/card_submit_enquiry             -> a stored-row result; held while the hold flag is set
//   GET  /__hold  /__release  /__reset                -> test control of the enquiry response
import http from 'node:http'

const PORT = Number(process.env.FAKE_SUPABASE_PORT || 54399)

const CARDS = {
  'phill-mcgurk': {
    card_slug: 'phill-mcgurk', display_name: 'Phill McGurk', role_title: 'Founder', business_name: 'Unite Group',
    email: 'founder@example.test', phone: '+61 491 570 157', service_area: 'Brisbane, Queensland', published_at: '2026-10-24T00:00:00Z',
  },
  'acme-plumbing': {
    card_slug: 'acme-plumbing', display_name: 'Sam Example', role_title: 'Licensed Plumber', business_name: 'Acme Plumbing',
    email: 'sam@example.test', phone: '0491 570 158', service_area: 'Gold Coast, Queensland', published_at: '2026-10-24T00:00:00Z',
  },
}

let held = false
const waiting = []
const release = () => { held = false; while (waiting.length) waiting.shift()() }
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)) }

http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
  if (url.pathname === '/__hold') { held = true; return json(res, 200, { held }) }
  if (url.pathname === '/__release' || url.pathname === '/__reset') { release(); return json(res, 200, { held }) }
  if (url.pathname === '/rest/v1/card_profiles') {
    const slug = (url.searchParams.get('card_slug') || '').replace(/^eq\./, '')
    const row = CARDS[slug]
    // supabase-js maybeSingle() asks for a JSON array on GET; .single() asks for one object. Honour both.
    if (/vnd\.pgrst\.object/.test(req.headers.accept || '')) {
      if (!row) return json(res, 406, { code: 'PGRST116', details: 'The result contains 0 rows', hint: null, message: 'JSON object requested, multiple (or no) rows returned' })
      return json(res, 200, row)
    }
    return json(res, 200, row ? [row] : [])
  }
  if (url.pathname === '/rest/v1/rpc/card_submit_enquiry') {
    req.resume()
    const reply = () => json(res, 200, { id: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d', created_at: '2026-10-25T00:00:00Z' })
    return held ? waiting.push(reply) : reply()
  }
  json(res, 404, { message: 'not found in test fake' })
}).listen(PORT, '127.0.0.1', () => console.log(`fake supabase on ${PORT}`))
