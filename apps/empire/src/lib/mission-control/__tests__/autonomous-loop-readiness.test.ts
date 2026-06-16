import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildAutonomousLoopReadiness } from '../autonomous-loop-readiness';

function tempRepo() {
  const root = mkdtempSync(join(tmpdir(), 'loop-readiness-'));
  return root;
}

describe('buildAutonomousLoopReadiness', () => {
  it('blocks when Linear or runner credentials are missing', () => {
    const payload = buildAutonomousLoopReadiness({
      env: {},
      root: tempRepo(),
      now: new Date('2026-06-16T00:00:00.000Z'),
    });

    expect(payload.overall).toBe('blocked');
    expect(payload.checks.find((check) => check.id === 'linear-api-key')).toMatchObject({
      state: 'blocked',
      required: true,
    });
    expect(payload.checks.find((check) => check.id === 'runner-command')).toMatchObject({
      state: 'blocked',
      required: true,
    });
  });

  it('reports ready when required loop pieces are configured', () => {
    const root = tempRepo();
    writeFileSync(join(root, 'scripts-marker'), '');
    const scriptsDir = join(root, 'scripts');
    mkdirSync(scriptsDir, { recursive: true });
    writeFileSync(join(scriptsDir, 'mission-control-linear-loop.mjs'), '');
    writeFileSync(join(scriptsDir, 'start-mission-control-loop.sh'), '');

    const payload = buildAutonomousLoopReadiness({
      env: {
        LINEAR_API_KEY: 'redacted',
        MISSION_CONTROL_RUNNER_CMD: 'claude -p "$(cat {prompt})"',
        MISSION_CONTROL_PUSH: '1',
        MISSION_CONTROL_COMPLETE_ON_SUCCESS: '1',
      },
      root,
      now: new Date('2026-06-16T00:00:00.000Z'),
    });

    expect(payload.overall).toBe('ready');
    expect(payload.nextAction).toContain('Start scripts/start-mission-control-loop.sh');
  });
});
