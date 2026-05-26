import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const outputDir = path.join(repoRoot, 'docs/margot/personal-intelligence/approval-handoff');
const scriptPath = path.join(repoRoot, 'scripts/personal-intelligence-approval-handoff.ts');
const fixturePath = path.join(repoRoot, 'docs/margot/personal-intelligence/fixtures/phase-1f-approval-handoff-example.json');

function runApprovalHandoff(inputPath: string): void {
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

describe('personal-intelligence-approval-handoff script', () => {
  it('refuses to overwrite symlink handoff output files under the safe handoff directory', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'approval-handoff-symlink-'));
    const inputPath = path.join(tempDir, 'input.json');
    const outsideTarget = path.join(tempDir, 'outside.json');
    const outputJson = path.join(outputDir, 'symlink-handoff-regression.json');

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
            handoffName: 'symlink-handoff-regression',
          },
          null,
          2,
        ),
        'utf8',
      );

      expect(() => runApprovalHandoff(inputPath)).toThrow('Refusing to overwrite Approval Handoff symlink output file');
      expect(fs.readFileSync(outsideTarget, 'utf8')).toBe('outside-safe-original\n');
    } finally {
      fs.rmSync(outputJson, { force: true });
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('refuses to overwrite regular handoff files so generated action packs are write-once by name', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'approval-handoff-existing-'));
    const inputPath = path.join(tempDir, 'input.json');
    const outputJson = path.join(outputDir, 'existing-handoff-regression.json');
    const outputMarkdown = path.join(outputDir, 'existing-handoff-regression.md');

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
            handoffName: 'existing-handoff-regression',
          },
          null,
          2,
        ),
        'utf8',
      );

      expect(() => runApprovalHandoff(inputPath)).toThrow('Refusing to overwrite existing Approval Handoff output file');
      expect(fs.readFileSync(outputJson, 'utf8')).toBe('existing-json\n');
      expect(fs.readFileSync(outputMarkdown, 'utf8')).toBe('existing-markdown\n');
    } finally {
      fs.rmSync(outputJson, { force: true });
      fs.rmSync(outputMarkdown, { force: true });
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
