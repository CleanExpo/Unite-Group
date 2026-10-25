/**
 * Tier classification tests — UNI-2388.
 *
 * The 'ai' tier (5 req/min) is meant for the public chat agent at /api/agent
 * only. It must NOT capture the bearer-authed machine plane under /api/agents/*
 * (runner claim/release, lifecycle events), which runs at ~8 req/min and was
 * observed 429-dropped in a live E2E.
 */

import { describe, expect, it } from 'vitest';

import { NextRequest } from 'next/server';

import { checkRateLimit, classifyTier } from '../rate-limit';

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

// UNI-3002: /api/events sat on the standard tier, so after 30 analytics beacons the proxy answered
// 429 before the route's silent-204 contract, and the same budget then throttled /api/leads.
describe('UNI-3002 analytics bucket', () => {
  const post = (path: string, ip: string) =>
    new NextRequest(`https://unite-group.in${path}`, { method: 'POST', headers: { 'x-forwarded-for': ip } });

  it("classifies exactly '/api/events' as its own 'analytics' tier", () => {
    expect(classifyTier('/api/events')).toBe('analytics');
    expect(classifyTier('/api/agents/events')).toBe('standard');
    expect(classifyTier('/api/eventsx')).toBe('standard');
    expect(classifyTier('/api/events/other')).toBe('standard');
  });

  it('lets more analytics beacons through than the route keeps (60/min) and leaves the standard budget untouched', () => {
    const ip = '198.51.100.31';
    for (let i = 0; i < 70; i++) expect(checkRateLimit(post('/api/events', ip))?.success).toBe(true);
    const leads = checkRateLimit(post('/api/leads', ip));
    expect(leads).toMatchObject({ success: true, limit: 30, remaining: 29 });
  });

  it('still has a proxy ceiling for analytics', () => {
    const ip = '198.51.100.32';
    let blocked = false;
    for (let i = 0; i < 1000 && !blocked; i++) blocked = checkRateLimit(post('/api/events', ip))?.success === false;
    expect(blocked).toBe(true);
  });
});

