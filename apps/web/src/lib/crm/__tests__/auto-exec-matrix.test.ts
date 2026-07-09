// UNI-2234 — auto-exec-matrix.ts tests.

import { evaluateAutoExecute, journalAutoExecution, AUTO_EXEC_CONFIG } from '@/lib/crm/auto-exec-matrix';
import { insertEvidenceLedgerRow } from '@/lib/obsidian/evidence';

vi.mock('@/lib/obsidian/evidence', () => ({
  insertEvidenceLedgerRow: vi.fn(),
}));

describe('evaluateAutoExecute', () => {
  const originalKillSwitch = process.env.CRM_AUTO_EXECUTE;

  afterEach(() => {
    if (originalKillSwitch === undefined) delete process.env.CRM_AUTO_EXECUTE;
    else process.env.CRM_AUTO_EXECUTE = originalKillSwitch;
  });

  describe('kill switch off (unset or not "1")', () => {
    it.each([undefined, '0', 'true', 'yes', ''])('always returns safe:false with reason kill_switch_off (env=%s)', (value) => {
      if (value === undefined) delete process.env.CRM_AUTO_EXECUTE;
      else process.env.CRM_AUTO_EXECUTE = value;

      const result = evaluateAutoExecute('lead_conversion', { confidence: 0.99, hasExistingClientLink: false });
      expect(result).toEqual({ safe: false, tier: 'L1', reason: 'kill_switch_off' });
    });

    it('returns false for every subject type while off', () => {
      for (const subjectType of ['lead_conversion', 'opportunity_commitment', 'client_merge', 'data_export', 'other'] as const) {
        delete process.env.CRM_AUTO_EXECUTE;
        expect(evaluateAutoExecute(subjectType, {}).safe).toBe(false);
      }
    });
  });

  describe('kill switch on', () => {
    beforeEach(() => {
      process.env.CRM_AUTO_EXECUTE = '1';
    });

    describe('lead_conversion (L1)', () => {
      it('is safe when confidence >= threshold and no existing client link', () => {
        const result = evaluateAutoExecute('lead_conversion', {
          confidence: AUTO_EXEC_CONFIG.l1_confidence_threshold,
          hasExistingClientLink: false,
        });
        expect(result).toEqual({ safe: true, tier: 'L1', reason: 'l1_confidence_and_no_link_ok' });
      });

      it('is not safe when confidence is below threshold', () => {
        const result = evaluateAutoExecute('lead_conversion', {
          confidence: AUTO_EXEC_CONFIG.l1_confidence_threshold - 0.01,
          hasExistingClientLink: false,
        });
        expect(result).toEqual({ safe: false, tier: 'L1', reason: 'l1_confidence_below_threshold' });
      });

      it('is not safe when an existing client link is present, even at high confidence', () => {
        const result = evaluateAutoExecute('lead_conversion', {
          confidence: 0.99,
          hasExistingClientLink: true,
        });
        expect(result).toEqual({ safe: false, tier: 'L1', reason: 'l1_existing_client_link' });
      });

      it.each([
        ['confidence missing', { hasExistingClientLink: false }],
        ['hasExistingClientLink missing', { confidence: 0.99 }],
        ['no signals at all', {}],
        ['confidence wrong type', { confidence: 'high' as unknown as number, hasExistingClientLink: false }],
      ])('degrades to signal_unavailable, never guessing, when %s', (_label, signals) => {
        const result = evaluateAutoExecute('lead_conversion', signals);
        expect(result).toEqual({ safe: false, tier: 'L1', reason: 'signal_unavailable' });
      });
    });

    describe('opportunity_commitment (L2) — disabled at launch', () => {
      it('stays false for a value <= 500 forward-only move because l2_enabled is false', () => {
        expect(AUTO_EXEC_CONFIG.l2_enabled).toBe(false);
        const result = evaluateAutoExecute('opportunity_commitment', {
          value: 100,
          isForwardOnlyStageMove: true,
        });
        expect(result).toEqual({ safe: false, tier: 'L2', reason: 'l2_disabled' });
      });

      it('stays false even at the exact $500 boundary while disabled', () => {
        const result = evaluateAutoExecute('opportunity_commitment', {
          value: 500,
          isForwardOnlyStageMove: true,
        });
        expect(result).toEqual({ safe: false, tier: 'L2', reason: 'l2_disabled' });
      });
    });

    describe('opportunity_commitment (L2) — logic when flag is flipped', () => {
      afterEach(() => {
        AUTO_EXEC_CONFIG.l2_enabled = false;
      });

      it('is safe at value <= 500 and forward-only stage move once l2_enabled is flipped on', () => {
        AUTO_EXEC_CONFIG.l2_enabled = true;
        const result = evaluateAutoExecute('opportunity_commitment', {
          value: 500,
          isForwardOnlyStageMove: true,
        });
        expect(result).toEqual({ safe: true, tier: 'L2', reason: 'l2_value_and_stage_ok' });
      });

      it('rejects a value above the $500 threshold once flipped on', () => {
        AUTO_EXEC_CONFIG.l2_enabled = true;
        const result = evaluateAutoExecute('opportunity_commitment', {
          value: 501,
          isForwardOnlyStageMove: true,
        });
        expect(result).toEqual({ safe: false, tier: 'L2', reason: 'l2_value_exceeds_threshold' });
      });

      it('rejects a non-forward-only stage move regardless of value once flipped on', () => {
        AUTO_EXEC_CONFIG.l2_enabled = true;
        const result = evaluateAutoExecute('opportunity_commitment', {
          value: 100,
          isForwardOnlyStageMove: false,
        });
        expect(result).toEqual({ safe: false, tier: 'L2', reason: 'l2_not_forward_only' });
      });

      it('still degrades to signal_unavailable when flipped on but signals are missing', () => {
        AUTO_EXEC_CONFIG.l2_enabled = true;
        const result = evaluateAutoExecute('opportunity_commitment', {});
        expect(result).toEqual({ safe: false, tier: 'L2', reason: 'signal_unavailable' });
      });
    });

    describe('client_merge, data_export (L3)', () => {
      it.each(['client_merge', 'data_export'] as const)('always returns safe:false for %s regardless of signals', (subjectType) => {
        const result = evaluateAutoExecute(subjectType, {
          confidence: 1,
          hasExistingClientLink: false,
          value: 1,
          isForwardOnlyStageMove: true,
        });
        expect(result).toEqual({ safe: false, tier: 'L3', reason: 'high_risk_never_auto' });
      });
    });

    describe('other (L0)', () => {
      it('always returns safe:false, advise only', () => {
        const result = evaluateAutoExecute('other', {});
        expect(result).toEqual({ safe: false, tier: 'L0', reason: 'advise_only' });
      });

      it('treats an unknown/invalid subject type as L0 advise-only rather than guessing a tier', () => {
        const result = evaluateAutoExecute('totally_unknown_subject', {});
        expect(result).toEqual({ safe: false, tier: 'L0', reason: 'advise_only' });
      });
    });
  });
});

describe('journalAutoExecution', () => {
  const mockedInsert = vi.mocked(insertEvidenceLedgerRow);

  beforeEach(() => {
    mockedInsert.mockReset();
  });

  it('calls insertEvidenceLedgerRow with the given row', async () => {
    mockedInsert.mockResolvedValueOnce(undefined);
    const row = { kind: 'auto_execute', summary: 'test', detail: {}, evidence_path: null };

    await journalAutoExecution(row);

    expect(mockedInsert).toHaveBeenCalledWith(row);
  });

  it('never throws when insertEvidenceLedgerRow rejects', async () => {
    mockedInsert.mockRejectedValueOnce(new Error('boom'));
    const row = { kind: 'auto_execute', summary: 'test', detail: {}, evidence_path: null };

    await expect(journalAutoExecution(row)).resolves.toBeUndefined();
  });
});
