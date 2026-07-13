import { describe, it, expect } from 'vitest';
import { prepareFrontDeskRequest } from './runtime';
import type { FrontDeskConfig } from './config';

const config = {
  brand: { assistantName: 'the Unite-Group switchboard' },
  compliance: { businessIdentity: 'Unite-Group', aiDisclosure: true },
} as FrontDeskConfig;

const corpus = 'We offer water damage restoration.\n\nOpen 24/7 for emergencies.';

describe('prepareFrontDeskRequest', () => {
  it('grounds the system prompt in the matching corpus chunk', () => {
    const req = prepareFrontDeskRequest(config, corpus, 'do you do water damage?');
    expect(req.system).toContain('water damage restoration');
    expect(req.model).toBe('claude-sonnet-5');
    expect(req.messages[0]).toEqual({ role: 'user', content: 'do you do water damage?' });
  });

  it('carries the AI disclosure into the system prompt', () => {
    const req = prepareFrontDeskRequest(config, corpus, 'hello');
    expect(req.system).toMatch(/disclose that you are an AI/i);
  });
});
