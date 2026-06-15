import { logCrmDigestReadError, type CrmDigestReadStage } from '@/lib/crm/digest-read-error';

const ALL_STAGES: CrmDigestReadStage[] = ['leads', 'tasks', 'opportunities', 'unexpected'];
const ALL_CONTEXTS = ['api', 'command-center'] as const;

describe('logCrmDigestReadError', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('emits a single redacted JSON line per documented stage/context combination', () => {
    for (const stage of ALL_STAGES) {
      for (const context of ALL_CONTEXTS) {
        logCrmDigestReadError(stage, context);
      }
    }

    expect(consoleErrorSpy).toHaveBeenCalledTimes(ALL_STAGES.length * ALL_CONTEXTS.length);

    for (const call of consoleErrorSpy.mock.calls) {
      expect(call).toHaveLength(1);
      const payload = call[0];
      expect(typeof payload).toBe('string');
      const parsed = JSON.parse(payload as string);
      expect(parsed).toEqual({
        event: 'crm_digest_read_error',
        stage: expect.stringMatching(/^(leads|tasks|opportunities|unexpected)$/),
        context: expect.stringMatching(/^(api|command-center)$/),
      });
      // No raw error details, no PII, no secret-shaped strings.
      expect(payload as string).not.toContain('Error');
      expect(payload as string).not.toContain('@');
      expect(payload as string).not.toContain('x-api-key');
    }
  });

  it('refuses to log when stage is not in the documented CrmDigestReadStage union', () => {
    // Bypass the type system: simulate a future refactor passing a typo / different case.
    const badStage = 'Leads' as unknown as CrmDigestReadStage;
    logCrmDigestReadError(badStage, 'command-center');

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('refuses to log when context is not in the documented context set', () => {
    const badContext = 'workspace' as unknown as 'api' | 'command-center';
    logCrmDigestReadError('leads', badContext);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
