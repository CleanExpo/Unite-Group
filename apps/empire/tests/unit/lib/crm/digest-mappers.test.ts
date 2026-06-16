/**
 * CRM Digest Mappers — dedicated unit tests (gap-closure)
 *
 * The module was previously only exercised by `digest-edge-cases.test.ts`
 * (all-null columns + happy paths). This file closes the remaining
 * contract gaps:
 *
 *   - `readDigestOwner` env-var precedence + fallback
 *   - `QUALIFICATION_BANDS` exact set contents (including case-sensitivity)
 *   - `mapLead` qualificationBand derivation is fail-closed (only
 *     documented bands are surfaced; "hot"/"cold"/"QUALIFIED" all null)
 *   - `mapTask` source='margot_voice' detection via tags AND obsidian_path
 *   - `mapOpportunity` probability (percent → fraction) parsing,
 *     stage→status fallback, requiresApproval fail-closed on non-true
 *
 * Other primitives (`clean`, basic `valueEstimate` parsing, all-null row
 * fallbacks) are still covered by `digest-edge-cases.test.ts`.
 */

import {
  readDigestOwner,
  QUALIFICATION_BANDS,
  mapLead,
  mapTask,
  mapOpportunity,
  type CrmLeadDigestRow,
  type CrmTaskDigestRow,
  type CrmOpportunityDigestRow,
} from '@/lib/crm/digest-mappers';

describe('digest-mappers: readDigestOwner', () => {
  const ORIGINAL_ENV = process.env.UNITE_CRM_DIGEST_OWNER;

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.UNITE_CRM_DIGEST_OWNER;
    } else {
      process.env.UNITE_CRM_DIGEST_OWNER = ORIGINAL_ENV;
    }
  });

  it('returns the trimmed env value when set', () => {
    process.env.UNITE_CRM_DIGEST_OWNER = '  Custom Owner  ';
    expect(readDigestOwner()).toBe('Custom Owner');
  });

  it('falls back to "Margot" when env is unset', () => {
    delete process.env.UNITE_CRM_DIGEST_OWNER;
    expect(readDigestOwner()).toBe('Margot');
  });

  it('falls back to "Margot" when env is blank / whitespace', () => {
    process.env.UNITE_CRM_DIGEST_OWNER = '   ';
    expect(readDigestOwner()).toBe('Margot');
    process.env.UNITE_CRM_DIGEST_OWNER = '';
    expect(readDigestOwner()).toBe('Margot');
  });
});

describe('digest-mappers: QUALIFICATION_BANDS', () => {
  it('contains the four documented bands', () => {
    expect(QUALIFICATION_BANDS.has('qualified')).toBe(true);
    expect(QUALIFICATION_BANDS.has('nurture')).toBe(true);
    expect(QUALIFICATION_BANDS.has('needs_review')).toBe(true);
    expect(QUALIFICATION_BANDS.has('spam_risk')).toBe(true);
  });

  it('does not contain undocumented values (case-sensitive, exact)', () => {
    expect(QUALIFICATION_BANDS.has('hot')).toBe(false);
    expect(QUALIFICATION_BANDS.has('cold')).toBe(false);
    expect(QUALIFICATION_BANDS.has('QUALIFIED')).toBe(false);
    expect(QUALIFICATION_BANDS.has('Qualified')).toBe(false);
  });
});

describe('digest-mappers: mapLead qualificationBand (fail-closed)', () => {
  it('derives qualificationBand from status only when status is a documented band', () => {
    const row: CrmLeadDigestRow = {
      id: 'lead-band-1',
      first_name: 'Ada',
      last_name: 'Lovelace',
      company: 'Analytical Engines',
      status: 'qualified',
      qualification_score: 92,
      captured_at: '2026-06-09T00:00:00Z',
    };
    expect(mapLead(row).qualificationBand).toBe('qualified');
  });

  it('nulls qualificationBand when status is an undocumented value (e.g. "hot")', () => {
    const row: CrmLeadDigestRow = {
      id: 'lead-band-2',
      first_name: 'X',
      last_name: 'Y',
      company: 'Co',
      status: 'hot',
      qualification_score: 50,
      captured_at: '2026-06-09T00:00:00Z',
    };
    expect(mapLead(row).status).toBe('hot');
    expect(mapLead(row).qualificationBand).toBeNull();
  });

  it('nulls qualificationBand when status is a documented band in wrong case', () => {
    const row: CrmLeadDigestRow = {
      id: 'lead-band-3',
      first_name: 'X',
      last_name: 'Y',
      company: 'Co',
      status: 'QUALIFIED',
      qualification_score: 50,
      captured_at: '2026-06-09T00:00:00Z',
    };
    expect(mapLead(row).qualificationBand).toBeNull();
  });
});

describe('digest-mappers: mapTask voice-source detection', () => {
  it('marks source=margot_voice when tags include margot-voice', () => {
    const row: CrmTaskDigestRow = {
      id: 'task-voice-1',
      title: 'Voice follow-up',
      status: 'open',
      priority: 'high',
      assignee_name: 'Phill',
      tags: ['margot-voice'],
      created_at: '2026-06-09T00:00:00Z',
    };
    expect(mapTask(row).source).toBe('margot_voice');
  });

  it('marks source=margot_voice when obsidian_path starts with voice/', () => {
    const row: CrmTaskDigestRow = {
      id: 'task-voice-2',
      title: 'Voice note',
      status: 'open',
      priority: 'high',
      assignee_name: 'Margot',
      tags: [],
      obsidian_path: 'voice/inbox/2026-06-09.md',
      created_at: '2026-06-09T00:00:00Z',
    };
    expect(mapTask(row).source).toBe('margot_voice');
  });

  it('leaves source=null when neither tag nor path indicates voice', () => {
    const row: CrmTaskDigestRow = {
      id: 'task-voice-3',
      title: 'Plain CRM task',
      status: 'open',
      priority: 'normal',
      assignee_name: 'Phill',
      tags: ['crm', 'review'],
      created_at: '2026-06-09T00:00:00Z',
    };
    expect(mapTask(row).source).toBeNull();
  });

  it('trims whitespace from voice tag and still matches', () => {
    const row: CrmTaskDigestRow = {
      id: 'task-voice-4',
      title: 'Trim test',
      status: 'open',
      priority: 'normal',
      assignee_name: 'X',
      tags: ['  margot-voice  '],
      created_at: '2026-06-09T00:00:00Z',
    };
    expect(mapTask(row).source).toBe('margot_voice');
  });
});

describe('digest-mappers: mapOpportunity (probability + approval)', () => {
  it('parses probability (percent → fraction)', () => {
    const row: CrmOpportunityDigestRow = {
      id: 'opp-prob-1',
      name: 'CRM buildout',
      stage: 'discovery',
      status: 'open',
      value_amount: 25000,
      probability: 40,
      approval_required: true,
      next_action: 'Draft scope',
      updated_at: '2026-06-09T00:00:00Z',
    };
    expect(mapOpportunity(row).probability).toBeCloseTo(0.4);
  });

  it('nulls probability when not a number', () => {
    const row: CrmOpportunityDigestRow = {
      id: 'opp-prob-2',
      name: 'Opp',
      stage: 'discovery',
      status: 'open',
      value_amount: null,
      probability: null,
      approval_required: false,
      next_action: null,
      updated_at: '2026-06-09T00:00:00Z',
    };
    expect(mapOpportunity(row).probability).toBeNull();
  });

  it('falls back stage → status when stage is empty', () => {
    const row: CrmOpportunityDigestRow = {
      id: 'opp-stage-1',
      name: 'Opp',
      stage: null,
      status: 'qualified',
      value_amount: null,
      probability: null,
      approval_required: false,
      next_action: null,
      updated_at: '2026-06-09T00:00:00Z',
    };
    expect(mapOpportunity(row).stage).toBe('qualified');
  });

  it('requires explicit true for requiresApproval (fail-closed)', () => {
    const row: CrmOpportunityDigestRow = {
      id: 'opp-approval-1',
      name: 'Opp',
      stage: 'discovery',
      status: 'open',
      value_amount: null,
      probability: null,
      approval_required: null,
      next_action: null,
      updated_at: '2026-06-09T00:00:00Z',
    };
    expect(mapOpportunity(row).requiresApproval).toBe(false);
  });
});
