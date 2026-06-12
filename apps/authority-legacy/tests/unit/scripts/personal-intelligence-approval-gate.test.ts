import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const outputDir = path.join(repoRoot, 'docs/margot/personal-intelligence/approval-gate');
const scriptPath = path.join(repoRoot, 'scripts/personal-intelligence-approval-gate.ts');
const fixturePath = path.join(repoRoot, 'docs/margot/personal-intelligence/fixtures/phase-1h-approval-gate-example.json');

function runApprovalGate(inputPath: string, targetOutputDir = outputDir): string {
  return execFileSync(
    'npx',
    [
      'ts-node',
      '--transpile-only',
      '-O',
      '{"module":"commonjs","moduleResolution":"node"}',
      scriptPath,
      inputPath,
      targetOutputDir,
    ],
    { cwd: repoRoot, encoding: 'utf8', stdio: 'pipe' },
  );
}

describe('personal-intelligence-approval-gate script', () => {
  it('generates deterministic local JSON and Markdown approval-gate artifacts from the Phase 1H fixture', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'approval-gate-generate-'));
    const safeSubdir = path.join(outputDir, path.basename(tempDir));

    try {
      const stdout = runApprovalGate(fixturePath, safeSubdir);
      const outputJson = path.join(safeSubdir, '2026-05-25-phase-1h-approval-gate-example.json');
      const outputMarkdown = path.join(safeSubdir, '2026-05-25-phase-1h-approval-gate-example.md');
      const parsed = JSON.parse(fs.readFileSync(outputJson, 'utf8')) as {
        applyRequests: Array<{ sourceReviewStatus: string; requestedActionType: string; applyState: string }>;
      };
      const markdown = fs.readFileSync(outputMarkdown, 'utf8');

      expect(stdout).toContain('Approval Gate JSON written:');
      expect(stdout).toContain('Apply requests: 5');
      expect(parsed.applyRequests.map((request) => [request.sourceReviewStatus, request.requestedActionType, request.applyState])).toEqual([
        ['approved', 'memory_apply_request', 'pending_human_gate'],
        ['approved', 'task_apply_request', 'pending_human_gate'],
        ['parked', 'future_queue_apply_request', 'pending_human_gate'],
        ['rejected', 'archive_marker_apply_request', 'pending_human_gate'],
        ['pending_review', 'hold_apply_request', 'pending_human_gate'],
      ]);
      expect(markdown).toContain('| phase-1c001-memory-1-memory-apply-request-2026-05-25t19-00-00-000z |');
      expect(markdown).toContain('No apply execution path was created or invoked.');
    } finally {
      fs.rmSync(safeSubdir, { recursive: true, force: true });
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('refuses to overwrite symlink approval-gate output files under the safe approval-gate directory', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'approval-gate-symlink-'));
    const inputPath = path.join(tempDir, 'input.json');
    const outsideTarget = path.join(tempDir, 'outside.json');
    const outputJson = path.join(outputDir, 'symlink-gate-regression.json');

    try {
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(outsideTarget, 'outside-safe-original\n', 'utf8');
      fs.rmSync(outputJson, { force: true });
      fs.symlinkSync(outsideTarget, outputJson);

      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as Record<string, unknown>;
      fs.writeFileSync(inputPath, JSON.stringify({ ...fixture, gateName: 'symlink-gate-regression' }, null, 2), 'utf8');

      expect(() => runApprovalGate(inputPath)).toThrow('Refusing to overwrite Approval Gate symlink output file');
      expect(fs.readFileSync(outsideTarget, 'utf8')).toBe('outside-safe-original\n');
    } finally {
      fs.rmSync(outputJson, { force: true });
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('refuses unsafe output roots and regular-file overwrites so apply-request artifacts are write-once', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'approval-gate-existing-'));
    const inputPath = path.join(tempDir, 'input.json');
    const outputJson = path.join(outputDir, 'existing-gate-regression.json');
    const outputMarkdown = path.join(outputDir, 'existing-gate-regression.md');

    try {
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(outputJson, 'existing-json\n', 'utf8');
      fs.writeFileSync(outputMarkdown, 'existing-markdown\n', 'utf8');
      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as Record<string, unknown>;
      fs.writeFileSync(inputPath, JSON.stringify({ ...fixture, gateName: 'existing-gate-regression' }, null, 2), 'utf8');

      expect(() => runApprovalGate(inputPath, tempDir)).toThrow('Refusing to write Approval Gate output outside safe root');
      expect(() => runApprovalGate(inputPath)).toThrow('Refusing to overwrite existing Approval Gate output file');
      expect(fs.readFileSync(outputJson, 'utf8')).toBe('existing-json\n');
      expect(fs.readFileSync(outputMarkdown, 'utf8')).toBe('existing-markdown\n');
    } finally {
      fs.rmSync(outputJson, { force: true });
      fs.rmSync(outputMarkdown, { force: true });
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
