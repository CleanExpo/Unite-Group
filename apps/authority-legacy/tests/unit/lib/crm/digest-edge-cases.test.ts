import {
  createCrmDailyDigest,
} from '@/lib/crm/daily-digest';
import {
  clean,
  valueEstimate,
  mapLead,
  mapTask,
  mapOpportunity,
  type CrmLeadDigestRow,
  type CrmTaskDigestRow,
  type CrmOpportunityDigestRow,
} from '@/lib/crm/digest-mappers';

describe('digest edge cases', () => {
  describe('clean()', () => {
    it('returns empty string for null', () => {
      expect(clean(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(clean(undefined)).toBe('');
    });

    it('trims whitespace', () => {
      expect(clean('  hello  ')).toBe('hello');
    });

    it('returns empty string for whitespace-only', () => {
      expect(clean('   ')).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(clean('')).toBe('');
    });

    it('handles unicode characters', () => {
      expect(clean(' 日本語 ')).toBe('日本語');
    });
  });

  describe('valueEstimate()', () => {
    it('returns null for non-numeric string', () => {
      expect(valueEstimate('not-a-number')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(valueEstimate('')).toBeNull();
    });

    it('parses integer string', () => {
      expect(valueEstimate('15000')).toBe(15000);
    });

    it('parses decimal string', () => {
      expect(valueEstimate('15000.50')).toBe(15000.5);
    });

    it('returns null for Infinity', () => {
      expect(valueEstimate(Infinity)).toBeNull();
    });
  });

  describe('mapLead() with all-null columns', () => {
    it('handles completely null row', () => {
      const row: CrmLeadDigestRow = {
        id: 'lead-null-test',
        first_name: null,
        last_name: null,
        company: null,
        status: null,
        qualification_score: null,
        captured_at: '2026-05-29T00:00:00Z',
      };

      const result = mapLead(row);

      expect(result).toMatchObject({
        id: 'lead-null-test',
        name: null,
        company: null,
        status: null,
        qualificationBand: null,
        score: null,
        nextAction: 'Review and decide next CRM action',
      });
    });

    it('handles partial null row', () => {
      const row: CrmLeadDigestRow = {
        id: 'lead-partial',
        first_name: 'Ada',
        last_name: null,
        company: '  ',
        status: 'qualified',
        qualification_score: null,
        captured_at: '2026-05-29T00:00:00Z',
      };

      const result = mapLead(row);

      expect(result.name).toBe('Ada');
      expect(result.company).toBeNull();
      expect(result.qualificationBand).toBe('qualified');
    });
  });

  describe('mapTask() with all-null columns', () => {
    it('falls back to Untitled task when title is null', () => {
      const row: CrmTaskDigestRow = {
        id: 'task-null-test',
        title: null,
        status: null,
        priority: null,
        assignee_name: null,
        created_at: '2026-05-29T00:00:00Z',
      };

      const result = mapTask(row);

      expect(result).toMatchObject({
        id: 'task-null-test',
        title: 'Untitled task',
        owner: null,
        status: null,
        priority: null,
      });
    });
  });

  describe('mapOpportunity() with all-null columns', () => {
    it('falls back to Untitled opportunity when name is null', () => {
      const row: CrmOpportunityDigestRow = {
        id: 'opp-null-test',
        name: null,
        stage: null,
        status: null,
        value_amount: null,
        probability: null,
        approval_required: null,
        next_action: null,
        updated_at: '2026-05-29T00:00:00Z',
      };

      const result = mapOpportunity(row);

      expect(result).toMatchObject({
        id: 'opp-null-test',
        name: 'Untitled opportunity',
        stage: null,
        valueEstimate: null,
        probability: null,
        requiresApproval: false,
        nextAction: null,
      });
    });

    it('parses string value_amount', () => {
      const row: CrmOpportunityDigestRow = {
        id: 'opp-string-value',
        name: 'Deal',
        stage: 'proposal',
        status: 'open',
        value_amount: '25000',
        probability: 50,
        approval_required: true,
        next_action: 'Send proposal',
        updated_at: '2026-05-29T00:00:00Z',
      };

      const result = mapOpportunity(row);

      expect(result.valueEstimate).toBe(25000);
      expect(result.probability).toBe(0.5);
      expect(result.requiresApproval).toBe(true);
    });
  });

  describe('createCrmDailyDigest() with empty arrays', () => {
    it('handles completely empty input', () => {
      const digest = createCrmDailyDigest({
        generatedAt: '2026-05-29T00:00:00Z',
        leads: [],
        opportunities: [],
        tasks: [],
        blockers: [],
        verification: [],
      });

      expect(digest.summary).toEqual({
        leadCount: 0,
        qualifiedLeadCount: 0,
        opportunityCount: 0,
        approvalRequiredCount: 0,
        blockedTaskCount: 0,
        blockerCount: 0,
        staleIntegrationCount: 0,
      });

      expect(digest.sections.operatorPriorities).toEqual([
        'No CRM priorities supplied for this digest window.',
      ]);
      expect(digest.sections.approvals).toEqual([
        'No approval-required items supplied for this digest window.',
      ]);
      expect(digest.sections.blockers).toEqual([
        'No blockers supplied for this digest window.',
      ]);
      expect(digest.sections.verification).toEqual([
        'No verification supplied for this digest window.',
      ]);
    });

    it('handles undefined inputs gracefully', () => {
      const digest = createCrmDailyDigest({
        generatedAt: '2026-05-29T00:00:00Z',
      });

      expect(digest.summary.leadCount).toBe(0);
      expect(digest.summary.opportunityCount).toBe(0);
      expect(digest.summary.blockedTaskCount).toBe(0);
    });
  });

  describe('createCrmDailyDigest() with null-rich data', () => {
    it('handles leads with null names and scores', () => {
      const digest = createCrmDailyDigest({
        generatedAt: '2026-05-29T00:00:00Z',
        leads: [
          {
            id: 'lead-1',
            name: null,
            company: null,
            status: 'new',
            score: null,
          },
        ],
        opportunities: [],
        tasks: [],
      });

      expect(digest.summary.leadCount).toBe(1);
      expect(digest.summary.qualifiedLeadCount).toBe(0);
      expect(digest.sections.operatorPriorities[0]).toContain('lead-1');
    });
  });
});
