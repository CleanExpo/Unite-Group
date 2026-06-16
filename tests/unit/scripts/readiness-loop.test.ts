import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const scriptPath = resolve(__dirname, '../../../scripts/readiness-loop.mjs');

function writeFixtureFiles(overrides: Partial<Record<'gates' | 'state', unknown>> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'readiness-loop-'));
  const gatesFile = join(dir, 'readiness-gates.json');
  const stateFile = join(dir, 'readiness-state.json');
  const markerFile = join(dir, 'production-command-ran');

  const gates = overrides.gates ?? [
    {
      id: 'PILOT-GATE',
      phase: 'pilot',
      title: 'Pilot gate',
      severity: 'blocker',
      owner: 'Nova',
      check: { kind: 'attestation', attestation_key: 'pilot_signed' },
    },
    {
      id: 'PRODUCTION-GATE',
      tier: 'production',
      phase: 'production',
      title: 'Production gate',
      severity: 'major',
      owner: 'Grid',
      check: { kind: 'attestation', attestation_key: 'production_signed' },
    },
  ];

  writeFileSync(
    gatesFile,
    JSON.stringify(
      {
        meta: { product: 'RestoreAssist test' },
        gates,
      },
      null,
      2,
    ),
  );

  writeFileSync(
    stateFile,
    JSON.stringify(overrides.state ?? { attestations: {}, runs: [{ at: 'baseline', done: false }] }, null, 2),
  );

  return { gatesFile, markerFile, stateFile };
}

function readStateRuns(stateFile: string) {
  return JSON.parse(readFileSync(stateFile, 'utf8')).runs;
}

describe('readiness-loop tier handling', () => {
  it('rejects an unknown tier without appending a run', () => {
    const { gatesFile, stateFile } = writeFixtureFiles();

    const result = spawnSync(process.execPath, [scriptPath, '--tier=staging', '--json'], {
      env: { ...process.env, GATES_FILE: gatesFile, STATE_FILE: stateFile },
      encoding: 'utf8',
    });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Invalid tier 'staging'");
    expect(result.stderr).toContain('Expected --tier=pilot or --tier=production');
    expect(result.stdout).toBe('');
    expect(readStateRuns(stateFile)).toEqual([{ at: 'baseline', done: false }]);
  });

  it('does not run deferred production commands in the pilot tier', () => {
    const { gatesFile, markerFile, stateFile } = writeFixtureFiles({
      gates: [
        {
          id: 'PILOT-GATE',
          phase: 'pilot',
          title: 'Pilot gate',
          severity: 'blocker',
          owner: 'Nova',
          check: { kind: 'attestation', attestation_key: 'pilot_signed' },
        },
        {
          id: 'PRODUCTION-COMMAND',
          tier: 'production',
          phase: 'production',
          title: 'Production command gate',
          severity: 'major',
          owner: 'Grid',
          check: { kind: 'command', run: 'node -e "require(\'node:fs\').writeFileSync(process.env.MARKER_FILE, \'ran\')"' },
        },
      ],
    });

    const result = spawnSync(process.execPath, [scriptPath, '--tier=pilot', '--json'], {
      env: { ...process.env, GATES_FILE: gatesFile, STATE_FILE: stateFile, TARGET_REPO: process.cwd(), MARKER_FILE: markerFile },
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(existsSync(markerFile)).toBe(false);

    const body = JSON.parse(result.stdout);
    expect(body.summary.deferred_to_production).toBe(1);
    expect(body.summary.in_scope).toBe(1);
  });

  it.each([
    ['prodution', "'prodution'"],
    ['', "''"],
    [null, 'null'],
  ])('rejects registry gate tier %s before appending a run', (tier, expectedLabel) => {
    const { gatesFile, stateFile } = writeFixtureFiles({
      gates: [
        {
          id: 'MISSPELLED-TIER',
          tier,
          phase: 'production',
          title: 'Typo tier gate',
          severity: 'major',
          owner: 'Grid',
          check: { kind: 'attestation', attestation_key: 'typo_signed' },
        },
      ],
    });

    const result = spawnSync(process.execPath, [scriptPath, '--json'], {
      env: { ...process.env, GATES_FILE: gatesFile, STATE_FILE: stateFile },
      encoding: 'utf8',
    });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain(`Invalid gate tier ${expectedLabel} on gate MISSPELLED-TIER`);
    expect(result.stdout).toBe('');
    expect(readStateRuns(stateFile)).toEqual([{ at: 'baseline', done: false }]);
  });
});
