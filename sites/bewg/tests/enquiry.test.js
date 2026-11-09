'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildLead, MIN_FILL_MS } = require('../api/_lead');
const { handler } = require('../api/enquiry');

const NOW = 1_800_000_000_000;
const good = () => ({
  first_name: ' Jo ', last_name: 'Citizen', email: 'Jo@Example.com', phone: '0412 345 678',
  suburb: 'Bayswater', postcode: '3153', property_type: 'House', problems: ['mould', 'floor', 'evil'],
  how_long: '1 to 6 months', insurance: 'yes', call_time: 'Morning', heard: 'Google',
  message: 'Musty smell in the back bedroom.', consent: 'yes', company_website: '', started_at: String(NOW - 60_000),
});

test('maps a valid enquiry onto the Unite-Group lead API shape with business_key bewg', () => {
  const r = buildLead(good(), NOW);
  assert.equal(r.ok, true);
  assert.equal(r.lead.business_key, 'bewg');
  assert.equal(r.lead.first_name, 'Jo');
  assert.equal(r.lead.email, 'jo@example.com');
  assert.equal(r.lead.marketing_consent, false);
  assert.equal(r.lead.interests, 'Mould, Timber floor lifting or cupping');
  assert.match(r.lead.message, /^Property: Bayswater 3153 · House$/m);
  assert.match(r.lead.message, /Insurance claim or legal matter: yes/);
  assert.match(r.lead.message, /Musty smell in the back bedroom\./);
  assert.ok(!r.lead.message.includes('evil'), 'unknown problem values are dropped');
});

test('rejects missing consent, bad email, short phone, missing suburb, bad postcode', () => {
  for (const [patch, re] of [
    [{ consent: '' }, /tick the box/],
    [{ email: 'nope' }, /valid email/],
    [{ phone: '123' }, /phone number/],
    [{ suburb: '  ' }, /suburb/],
    [{ postcode: '31a3' }, /4 digits/],
    [{ first_name: '' }, /first name/],
  ]) {
    const r = buildLead({ ...good(), ...patch }, NOW);
    assert.equal(r.ok, false, JSON.stringify(patch));
    assert.equal(r.status, 400);
    assert.match(r.error, re);
  }
});

test('bots are dropped silently: honeypot filled, or submitted faster than a human can', () => {
  assert.deepEqual(buildLead({ ...good(), company_website: 'spam.biz' }, NOW), { ok: false, status: 200, silent: true });
  assert.equal(buildLead({ ...good(), started_at: String(NOW - (MIN_FILL_MS - 1)) }, NOW).silent, true);
});

function fakeRes() {
  return {
    code: 0, json_: null, headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.code = c; return this; },
    json(b) { this.json_ = b; return this; },
  };
}

test('handler forwards to the CRM and returns 201 when the CRM accepts', async () => {
  let sent;
  const fetchOk = async (url, init) => { sent = { url, body: JSON.parse(init.body) }; return { status: 201, ok: true }; };
  const res = fakeRes();
  await handler({ method: 'POST', body: { ...good(), started_at: String(Date.now() - 60_000) } }, res, fetchOk);
  assert.equal(res.code, 201);
  assert.equal(sent.url, 'https://unite-group.in/api/leads');
  assert.equal(sent.body.business_key, 'bewg');
});

test('handler returns 502 with the phone fallback when the CRM fails, and never sends a bot lead', async () => {
  const res = fakeRes();
  await handler({ method: 'POST', body: { ...good(), started_at: String(Date.now() - 60_000) } }, res,
    async () => ({ status: 500, ok: false }));
  assert.equal(res.code, 502);
  assert.match(res.json_.error, /03 7075 1932/);

  let called = false;
  const res2 = fakeRes();
  await handler({ method: 'POST', body: { ...good(), company_website: 'x' } }, res2, async () => { called = true; });
  assert.equal(res2.code, 200);
  assert.equal(called, false);
});

test('handler refuses non-POST', async () => {
  const res = fakeRes();
  await handler({ method: 'GET' }, res, async () => { throw new Error('should not call'); });
  assert.equal(res.code, 405);
});
