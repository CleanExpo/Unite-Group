import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const scriptPath = resolve(__dirname, '../../../scripts/readiness-loop.mjs');

function writeFixtureFiles() {
  const dir = mkdtempSync(join(tmpdir(), 'readiness-loop-'));
  const gatesFile = join(dir, 'readiness-gates.json');
  const stateFile = join(dir, 'readiness-state.json');

  writeFileSync(
    gatesFile,
    JSON.stringify(
      {
        meta: { product: 'RestoreAssist test' },
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
            id: 'PRODUCTION-GATE',
            tier: 'production',
            phase: 'production',
            title: 'Production gate',
            severity: 'major',
            owner: 'Grid',
            check: { kind: 'attestation', attestation_key: 'production_signed' },
          },
        ],
      },
      null,
      2,
    ),
  );

  writeFileSync(
    stateFile,
    JSON.stringify({ attestations: {}, runs: [{ at: 'baseline', done: false }] }, null, 2),
  );

  return { gatesFile, stateFile };
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

    const state = JSON.parse(readFileSync(stateFile, 'utf8'));
    expect(state.runs).toEqual([{ at: 'baseline', done: false }]);
  });
});
