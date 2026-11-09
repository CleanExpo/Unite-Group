// POST /api/enquiry — the BEWG booking form.
// The browser posts here (same origin, so no CORS). This function forwards the lead, server to server, to the
// Unite-Group public lead API, which writes it to crm_leads with business_key "bewg" and alerts the team.
//
// Env (set in the Vercel project):
//   UNITE_LEADS_URL  optional, defaults to https://unite-group.in/api/leads
// No secrets are needed: /api/leads is a public, rate-limited endpoint.

'use strict';

const { buildLead } = require('./_lead');

const DEFAULT_URL = 'https://unite-group.in/api/leads';
const TIMEOUT_MS = 10000;
const MAX_BODY = 20000;
// Per-IP limit inside this function: the CRM sees every BEWG lead as coming from this function's IP, so its own
// per-IP limit can't tell visitors apart. In-memory per instance; enough to stop a single source flooding the CRM.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map();

function clientIp(req) {
  const h = req.headers || {};
  const raw = h['x-vercel-forwarded-for'] || h['x-forwarded-for'] || h['x-real-ip'] || '';
  return String(raw).split(',')[0].trim() || 'unknown';
}

function rateLimited(ip, now = Date.now()) {
  const e = hits.get(ip);
  if (!e || now - e.start > WINDOW_MS) { hits.set(ip, { start: now, count: 1 }); return false; }
  e.count += 1;
  if (hits.size > 5000) hits.clear();
  return e.count > MAX_PER_WINDOW;
}

function leadsUrl() {
  const u = (process.env.UNITE_LEADS_URL || DEFAULT_URL).trim();
  try {
    const parsed = new URL(u);
    if (parsed.protocol === 'https:' && /(^|\.)unite-group\.in$/.test(parsed.hostname)) return parsed.toString();
  } catch (_) { /* fall through */ }
  return DEFAULT_URL;
}

async function readJson(req) {
  const len = Number((req.headers || {})['content-length'] || 0);
  if (len > MAX_BODY) throw new Error('too_large');
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { if (req.body.length > MAX_BODY) throw new Error('too_large'); return JSON.parse(req.body); }
  const chunks = [];
  let size = 0;
  for await (const c of req) { size += c.length; if (size > MAX_BODY) throw new Error('too_large'); chunks.push(c); }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function handler(req, res, fetchImpl = globalThis.fetch) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (rateLimited(clientIp(req))) {
    return res.status(429).json({ error: 'Too many enquiries from this connection. Please call 03 7075 1932.' });
  }

  let body;
  try {
    body = await readJson(req);
  } catch {
    return res.status(400).json({ error: 'Please fill in the form and try again.' });
  }

  const result = buildLead(body);
  if (!result.ok) {
    if (result.silent) return res.status(200).json({ ok: true });
    return res.status(result.status).json({ error: result.error });
  }

  const url = leadsUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const upstream = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'bewg-site/1.0' },
      body: JSON.stringify(result.lead),
      signal: controller.signal,
    });
    if (upstream.status === 201 || upstream.ok) return res.status(201).json({ ok: true });
    // Never log the visitor's details: status code only.
    console.error('[bewg enquiry] CRM rejected lead, status', upstream.status);
  } catch (err) {
    console.error('[bewg enquiry] CRM unreachable:', err && err.name ? err.name : 'Error');
  } finally {
    clearTimeout(timer);
  }
  return res.status(502).json({
    error: 'Sorry, that didn’t send. Please call 03 7075 1932 and we’ll take it over the phone.',
  });
}

module.exports = (req, res) => handler(req, res);
module.exports.handler = handler;
module.exports._test = { leadsUrl, rateLimited, hits };
