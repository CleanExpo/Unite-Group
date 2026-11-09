// Pure logic for the BEWG enquiry form: validate the visitor's answers and map them onto the Unite-Group
// public lead API (apps/web/src/app/api/leads/route.ts). No network here, so it is unit-tested directly.
// Files starting with "_" inside api/ are not deployed as routes by Vercel.

'use strict';

const BUSINESS_KEY = 'bewg';
const MIN_FILL_MS = 3000; // a human takes longer than 3 seconds to fill this form

const PROBLEM_LABELS = {
  mould: 'Mould',
  condensation: 'Condensation and damp',
  floor: 'Timber floor lifting or cupping',
  subfloor: 'Subfloor moisture',
  leak: 'Leak with no obvious source',
  iaq: 'Indoor air quality',
};

function str(v, max) {
  if (typeof v !== 'string') return '';
  return v.replace(/\s+/g, ' ').trim().slice(0, max);
}

function longStr(v, max) {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

/**
 * Returns { ok: true, lead } or { ok: false, status, error } (error text is shown to the visitor),
 * or { ok: false, status: 200, silent: true } for bots, so they get no signal.
 */
function buildLead(body, now = Date.now()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, status: 400, error: 'Please fill in the form and try again.' };
  }

  // Bot traps: the hidden field must be empty and the form must not be submitted instantly.
  if (str(body.company_website, 200)) return { ok: false, status: 200, silent: true };
  const started = Number(body.started_at);
  if (Number.isFinite(started) && started > 0 && now - started < MIN_FILL_MS) {
    return { ok: false, status: 200, silent: true };
  }

  const firstName = str(body.first_name, 120);
  const lastName = str(body.last_name, 120);
  const email = str(body.email, 200).toLowerCase();
  const phone = str(body.phone, 40);
  const suburb = str(body.suburb, 120);
  const postcode = str(body.postcode, 4);

  if (!firstName) return { ok: false, status: 400, error: 'Please add your first name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, status: 400, error: 'Please add a valid email.' };
  if (phone.replace(/\D/g, '').length < 8) return { ok: false, status: 400, error: 'Please add a phone number we can call.' };
  if (!suburb) return { ok: false, status: 400, error: 'Please add the suburb of the property.' };
  if (postcode && !/^\d{4}$/.test(postcode)) return { ok: false, status: 400, error: 'Postcode should be 4 digits.' };
  if (body.consent !== 'yes' && body.consent !== true) {
    return { ok: false, status: 400, error: 'Please tick the box so we can contact you about this enquiry.' };
  }

  const rawProblems = Array.isArray(body.problems) ? body.problems : body.problems ? [body.problems] : [];
  const problems = [...new Set(rawProblems.filter((p) => Object.prototype.hasOwnProperty.call(PROBLEM_LABELS, p)))]
    .map((p) => PROBLEM_LABELS[p]);

  const service = str(body.service, 60);
  const howLong = str(body.how_long, 60);
  const propertyType = str(body.property_type, 60);
  const callTime = str(body.call_time, 40);
  const heard = str(body.heard, 80);
  const insurance = body.insurance === 'yes' || body.insurance === true;
  const notes = longStr(body.message, 2000);

  // crm_leads has no columns for these, so they go into the message as labelled lines the team can read at a glance.
  const lines = [
    `Property: ${suburb}${postcode ? ' ' + postcode : ''}${propertyType ? ' · ' + propertyType : ''}`,
    problems.length ? `Problems: ${problems.join(', ')}` : null,
    service ? `Service asked for: ${service}` : null,
    howLong ? `Going on for: ${howLong}` : null,
    insurance ? 'Insurance claim or legal matter: yes' : null,
    callTime ? `Best time to call: ${callTime}` : null,
    notes ? `\n${notes}` : null,
  ].filter(Boolean);

  return {
    ok: true,
    lead: {
      first_name: firstName,
      last_name: lastName || undefined,
      email,
      phone,
      message: lines.join('\n'),
      interests: problems.length ? problems.join(', ') : service || 'Inspection enquiry',
      referral_source: heard || undefined,
      marketing_consent: false,
      business_key: BUSINESS_KEY,
    },
  };
}

module.exports = { buildLead, BUSINESS_KEY, MIN_FILL_MS, PROBLEM_LABELS };
