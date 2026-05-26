import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const outputDir = path.join(repoRoot, 'docs/margot/personal-intelligence/approval-dry-run');
const scriptPath = path.join(repoRoot, 'scripts/personal-intelligence-approval-dry-run.ts');
const fixturePath = path.join(repoRoot, 'docs/margot/personal-intelligence/fixtures/phase-1g-approval-dry-run-example.json');

function runApprovalDryRun(inputPath: string): void {
  execFileSync(
    'npx',
    [
      'ts-node',
      '--transpile-only',
      '-O',
      '{"module":"commonjs","moduleResolution":"node"}',
      scriptPath,
      inputPath,
      outputDir,
    ],
    { cwd: repoRoot, encoding: 'utf8', stdio: 'pipe' },
  );
}

describe('personal-intelligence-approval-dry-run script', () => {
  it('refuses to overwrite symlink dry-run output files under the safe dry-run directory', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'approval-dry-run-symlink-'));
    const inputPath = path.join(tempDir, 'input.json');
    const outsideTarget = path.join(tempDir, 'outside.json');
    const outputJson = path.join(outputDir, 'symlink-dry-run-regression.json');

    try {
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(outsideTarget, 'outside-safe-original\n', 'utf8');
      fs.rmSync(outputJson, { force: true });
      fs.symlinkSync(outsideTarget, outputJson);

      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as Record<string, unknown>;
      fs.writeFileSync(
        inputPath,
        JSON.stringify(
          {
            ...fixture,
            dryRunName: 'symlink-dry-run-regression',
          },
          null,
          2,
        ),
        'utf8',
      );

      expect(() => runApprovalDryRun(inputPath)).toThrow('Refusing to overwrite Approval Dry-Run symlink output file');
      expect(fs.readFileSync(outsideTarget, 'utf8')).toBe('outside-safe-original\n');
    } finally {
      fs.rmSync(outputJson, { force: true });
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('refuses to overwrite regular dry-run files so generated dry-runs are write-once by name', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'approval-dry-run-existing-'));
    const inputPath = path.join(tempDir, 'input.json');
    const outputJson = path.join(outputDir, 'existing-dry-run-regression.json');
    const outputMarkdown = path.join(outputDir, 'existing-dry-run-regression.md');

    try {
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(outputJson, 'existing-json\n', 'utf8');
      fs.writeFileSync(outputMarkdown, 'existing-markdown\n', 'utf8');

      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as Record<string, unknown>;
      fs.writeFileSync(
        inputPath,
        JSON.stringify(
          {
            ...fixture,
            dryRunName: 'existing-dry-run-regression',
          },
          null,
          2,
        ),
        'utf8',
      );

      expect(() => runApprovalDryRun(inputPath)).toThrow('Refusing to overwrite existing Approval Dry-Run output file');
      expect(fs.readFileSync(outputJson, 'utf8')).toBe('existing-json\n');
      expect(fs.readFileSync(outputMarkdown, 'utf8')).toBe('existing-markdown\n');
    } finally {
      fs.rmSync(outputJson, { force: true });
      fs.rmSync(outputMarkdown, { force: true });
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
