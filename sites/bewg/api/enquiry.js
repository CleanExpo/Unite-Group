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

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (raw.length > 20000) throw new Error('too_large');
  return raw ? JSON.parse(raw) : {};
}

async function handler(req, res, fetchImpl = globalThis.fetch) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
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

  const url = (process.env.UNITE_LEADS_URL || DEFAULT_URL).trim();
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
