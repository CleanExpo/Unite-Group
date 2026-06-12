import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const outputDir = path.join(repoRoot, 'docs/margot/personal-intelligence/candidate-register');
const scriptPath = path.join(repoRoot, 'scripts/personal-intelligence-candidate-register.ts');
const fixturePath = path.join(
  repoRoot,
  'docs/margot/personal-intelligence/fixtures/phase-1d-candidate-register-promotion-example.json',
);

function runCandidateRegister(inputPath: string): void {
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

describe('personal-intelligence-candidate-register script', () => {
  it('refuses to overwrite symlink output files under the safe register directory', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'candidate-register-symlink-'));
    const inputPath = path.join(tempDir, 'input.json');
    const outsideTarget = path.join(tempDir, 'outside.json');
    const outputJson = path.join(outputDir, 'symlink-regression-note.json');

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
            sourceNotePath: 'docs/margot/personal-intelligence/nexus-mapping-notes/symlink-regression-note.md',
          },
          null,
          2,
        ),
        'utf8',
      );

      expect(() => runCandidateRegister(inputPath)).toThrow('Refusing to overwrite Candidate Register symlink output file');
      expect(fs.readFileSync(outsideTarget, 'utf8')).toBe('outside-safe-original\n');
    } finally {
      fs.rmSync(outputJson, { force: true });
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
