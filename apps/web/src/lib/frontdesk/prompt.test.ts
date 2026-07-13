import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from './prompt';
import type { FrontDeskConfig } from './config';

const config = {
  compliance: { businessIdentity: 'Unite-Group', aiDisclosure: true },
  brand: { assistantName: 'the Unite-Group switchboard' },
} as FrontDeskConfig;

describe('buildSystemPrompt', () => {
  it('names the assistant and the business', () => {
    const p = buildSystemPrompt(config, []);
    expect(p).toContain('the Unite-Group switchboard');
    expect(p).toContain('Unite-Group');
  });

  it('includes the AI disclosure when compliance requires it', () => {
    expect(buildSystemPrompt(config, [])).toMatch(/disclose that you are an AI/i);
  });

  it('omits the AI disclosure when not required', () => {
    const noDisclose = { ...config, compliance: { ...config.compliance, aiDisclosure: false } } as FrontDeskConfig;
    expect(buildSystemPrompt(noDisclose, [])).not.toMatch(/disclose that you are an AI/i);
  });

  it('injects retrieved context', () => {
    const p = buildSystemPrompt(config, [{ index: 0, text: 'Open 24/7 for emergencies.' }]);
    expect(p).toContain('Open 24/7 for emergencies.');
  });
});
