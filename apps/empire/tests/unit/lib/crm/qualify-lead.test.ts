import { qualifyLead } from '@/lib/crm/qualify-lead';

describe('qualifyLead', () => {
  it('returns a deterministic qualified recommendation for a strong commercial lead', () => {
    const result = qualifyLead({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@analyticalengines.co',
      phone: '+61400000000',
      company: 'Analytical Engines',
      jobTitle: 'Founder',
      message: 'We need a CRM automation and client portal buildout for our operations team this quarter.',
      interests: 'CRM, automation, client portal',
      referralSource: 'website',
      marketingConsent: true,
    });

    expect(result).toEqual({
      score: 100,
      band: 'qualified',
      reasons: [
        'valid email supplied',
        'business email domain supplied',
        'company supplied',
        'role supplied',
        'phone supplied',
        'specific message supplied',
        'commercial intent matches Unite-Group services',
        'marketing consent supplied',
        'referral source supplied',
      ],
      operatorNotes: [
        'Recommendation only: do not auto-convert or overwrite CRM identity from this score.',
        'Qualified means prioritize human review; it is not approval to create a client record.',
      ],
    });
  });

  it('keeps a free-email lead with useful intent in needs_review', () => {
    const result = qualifyLead({
      email: 'founder@gmail.com',
      company: 'New Studio',
      message: 'I need help with CRM setup and operations workflow for client onboarding.',
      interests: ['crm', 'workflow'],
    });

    expect(result.score).toBe(69);
    expect(result.band).toBe('needs_review');
    expect(result.reasons).toContain('free email domain needs human context');
    expect(result.operatorNotes).toContain(
      'Free email domain is not disqualifying, but confirm organization identity before conversion.',
    );
  });

  it('places incomplete but non-spam leads into nurture', () => {
    const result = qualifyLead({
      email: 'hello@gmail.com',
      message: 'Tell me more',
    });

    expect(result.score).toBe(48);
    expect(result.band).toBe('nurture');
    expect(result.reasons).toEqual([
      'valid email supplied',
      'free email domain needs human context',
      'company missing',
      'short message supplied',
    ]);
  });

  it('flags spam risk without making destructive decisions', () => {
    const result = qualifyLead({
      email: 'winner@mailinator.com',
      company: 'Casino Traffic',
      message: 'Guaranteed traffic crypto casino backlinks https://a.test https://b.test https://c.test',
      interests: 'rank first',
    });

    expect(result.score).toBe(0);
    expect(result.band).toBe('spam_risk');
    expect(result.reasons).toEqual([
      'valid email supplied',
      'email domain is disposable, test, or high risk',
      'company supplied',
      'specific message supplied',
      'spam-like terms detected',
      'excessive links detected',
    ]);
    expect(result.operatorNotes).toContain(
      'Do not discard automatically; review safely and avoid external follow-up until identity is checked.',
    );
  });

  it('is pure and stable for equivalent input', () => {
    const input = {
      email: 'ops@example.com',
      company: 'Example Ops',
      message: 'Need AI automation planning for client operations.',
    };

    expect(qualifyLead(input)).toEqual(qualifyLead({ ...input }));
  });
});
