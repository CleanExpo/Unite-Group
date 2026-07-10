import { describe, it, expect } from 'vitest';
import { parseFrontDeskConfig } from './config';

const valid = {
  project: 'unite-group',
  enabled: false,
  brand: { assistantName: 'Unite-Group switchboard', accent: '#0A0A0A' },
  voice: { provider: 'elevenlabs', voiceId: 'v-123', locale: 'en-AU' },
  knowledge: { kind: 'prompt', source: 'unite-group services' },
  channels: ['chat'],
  vendor: 'elevenlabs',
  phoneNumber: null,
  tools: ['human handoff'],
  compliance: { businessIdentity: 'Unite-Group', recordingDisclosure: true, aiDisclosure: true, dncrScrub: true },
};

describe('frontDeskConfigSchema', () => {
  it('accepts a well-formed config', () => {
    expect(() => parseFrontDeskConfig(valid)).not.toThrow();
  });

  it('rejects a non-AU voice locale (compliance-relevant)', () => {
    expect(() => parseFrontDeskConfig({ ...valid, voice: { ...valid.voice, locale: 'en-US' } })).toThrow();
  });

  it('rejects an empty channel list', () => {
    expect(() => parseFrontDeskConfig({ ...valid, channels: [] })).toThrow();
  });

  it('rejects a missing project key', () => {
    const { project: _drop, ...rest } = valid;
    expect(() => parseFrontDeskConfig(rest)).toThrow();
  });
});
