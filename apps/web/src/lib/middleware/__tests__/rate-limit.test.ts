/**
 * Tier classification tests — UNI-2388.
 *
 * The 'ai' tier (5 req/min) is meant for the public chat agent at /api/agent
 * only. It must NOT capture the bearer-authed machine plane under /api/agents/*
 * (runner claim/release, lifecycle events), which runs at ~8 req/min and was
 * observed 429-dropped in a live E2E.
 */

import { describe, expect, it } from 'vitest';

import { classifyTier } from '../rate-limit';

describe('classifyTier', () => {
  it("classifies the public chat agent root '/api/agent' as 'ai'", () => {
    expect(classifyTier('/api/agent')).toBe('ai');
  });

  it("classifies chat agent sub-routes '/api/agent/*' as 'ai'", () => {
    expect(classifyTier('/api/agent/chat')).toBe('ai');
  });

  it("does NOT classify '/api/agents/events' as 'ai'", () => {
    expect(classifyTier('/api/agents/events')).not.toBe('ai');
    expect(classifyTier('/api/agents/events')).toBe('standard');
  });

  it("does NOT classify '/api/agents/runner/claim' as 'ai'", () => {
    expect(classifyTier('/api/agents/runner/claim')).not.toBe('ai');
    expect(classifyTier('/api/agents/runner/claim')).toBe('standard');
  });

  it('skips cron routes', () => {
    expect(classifyTier('/api/cron/anything')).toBeNull();
  });

  it('skips non-API routes', () => {
    expect(classifyTier('/dashboard')).toBeNull();
  });
});
